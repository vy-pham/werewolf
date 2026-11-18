"""Utterance → text → translations → server. Independent of LiveKit (unit-tested with fakes)."""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

import numpy as np

from .server_api import Caption
from .stt import SpeechToText
from .translate import Translator

log = logging.getLogger(__name__)

Sink = Callable[[Caption], Awaitable[list[str]]]
# Language detection runs on a speaker's first utterance and then every N utterances.
REDETECT_EVERY = 5


@dataclass
class Utterance:
    room: str
    speaker_id: str
    audio: np.ndarray
    queued_at: float = field(default_factory=time.monotonic)


class CaptionPipeline:
    """A bounded queue processed by ONE model thread (CPU inference does not parallelize well).

    Under load the oldest utterances are dropped, and utterances that waited longer than
    `max_lag` are skipped: a caption that arrives 10 s late is worse than none.
    """

    def __init__(
        self,
        stt: SpeechToText,
        translator: Translator,
        sink: Sink,
        caption_langs: tuple[str, ...],
        max_lag: float = 8.0,
        max_queue: int = 32,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.stt = stt
        self.translator = translator
        self.sink = sink
        self.caption_langs = caption_langs
        self.max_lag = max_lag
        self.clock = clock
        self.queue: asyncio.Queue[Utterance] = asyncio.Queue(max_queue)
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='model')
        # room → caption languages its listeners want (from the server's last answer)
        self.wanted: dict[str, list[str]] = {}
        # speaker → (language of their last caption, utterances since it was detected)
        self.last_lang: dict[str, tuple[str, int]] = {}
        self.stats = {'captions': 0, 'dropped': 0, 'stale': 0, 'silent': 0, 'errors': 0}

    def submit(self, utterance: Utterance) -> None:
        if self.queue.full():
            self.queue.get_nowait()
            self.stats['dropped'] += 1
            log.warning('caption queue full: dropped the oldest utterance')
        self.queue.put_nowait(utterance)

    async def run(self) -> None:
        while True:
            utterance = await self.queue.get()
            try:
                await self.process(utterance)
            except Exception:
                self.stats['errors'] += 1
                log.exception('caption failed (room %s)', utterance.room)

    async def process(self, u: Utterance) -> Caption | None:
        if self.clock() - u.queued_at > self.max_lag:
            self.stats['stale'] += 1
            return None
        loop = asyncio.get_running_loop()
        targets = self.wanted.get(u.room, list(self.caption_langs))
        caption = await loop.run_in_executor(self.executor, self._infer, u, targets)
        if caption is None:
            self.stats['silent'] += 1
            return None
        _, since = self.last_lang.get(u.speaker_id, ('', 0))
        known = self._known_lang(u.speaker_id)
        self.last_lang[u.speaker_id] = (caption.lang, since + 1 if known else 0)
        self.wanted[u.room] = await self.sink(caption) or list(self.caption_langs)
        self.stats['captions'] += 1
        return caption

    def _known_lang(self, speaker: str) -> str | None:
        """The speaker's language, re-detected every REDETECT_EVERY utterances (they may switch)."""
        lang, since = self.last_lang.get(speaker, (None, 0))
        return lang if lang and since < REDETECT_EVERY else None

    def forget_room(self, room: str) -> None:
        self.wanted.pop(room, None)

    def _infer(self, u: Utterance, targets: list[str]) -> Caption | None:
        started = time.perf_counter()
        speech = self.stt.transcribe(u.audio, self._known_lang(u.speaker_id))
        if speech is None:
            return None
        stt_done = time.perf_counter()
        translations = self.translator.translate(speech.text, speech.lang, targets)
        # Timing only: what players say is not written to logs (transcripts live 24h in Mongo).
        log.info(
            'caption %s/%s [%s] %.1fs audio, stt %.2fs, mt %.2fs',
            u.room,
            u.speaker_id,
            speech.lang,
            len(u.audio) / 16_000,
            stt_done - started,
            time.perf_counter() - stt_done,
        )
        return Caption(u.room, u.speaker_id, speech.lang, speech.text, translations)
