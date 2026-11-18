"""Speech-to-text with faster-whisper (CTranslate2)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

import numpy as np

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Speech:
    text: str
    lang: str


class SpeechToText(Protocol):
    def transcribe(self, audio: np.ndarray, known_lang: str | None = None) -> Speech | None:
        """Float32 16 kHz mono audio → text, or None when nothing intelligible was said.
        `known_lang`: the speaker's language if already known (skips language detection)."""
        ...


# Whisper's well-known hallucinations on near-silence / noise.
_HALLUCINATIONS = {
    'thank you.',
    'thanks for watching!',
    'thank you for watching.',
    'subscribe to my channel',
    'hãy subscribe cho kênh ghiền mì gõ để không bỏ lỡ những video hấp dẫn',
    'cảm ơn các bạn đã theo dõi',
}


def is_hallucination(text: str) -> bool:
    t = text.strip().lower()
    return not t or t in _HALLUCINATIONS or all(not c.isalnum() for c in t)


class WhisperSTT:
    """faster-whisper, restricted to the caption languages.

    `known_lang` (the speaker's language, from earlier utterances) skips detection: one decode
    instead of detect + decode, which matters on CPU. Without it, language detection on a short
    utterance is unreliable, so a detection outside the allowed languages (or with low
    confidence) is re-decoded as the most likely allowed language.
    """

    def __init__(
        self,
        model: str,
        device: str,
        allowed_langs: tuple[str, ...],
        download_root: str | None = None,
    ) -> None:
        from faster_whisper import WhisperModel

        compute_type = 'int8_float16' if device == 'cuda' else 'int8'
        log.info('loading whisper %s on %s (%s)', model, device, compute_type)
        self.model = WhisperModel(
            model, device=device, compute_type=compute_type, download_root=download_root
        )
        self.allowed = allowed_langs

    def transcribe(self, audio: np.ndarray, known_lang: str | None = None) -> Speech | None:
        if known_lang in self.allowed:
            text, lang, _, _ = self._run(audio, known_lang)
            return None if is_hallucination(text) else Speech(text=text, lang=lang)
        text, lang, prob, probs = self._run(audio, None)
        if self.allowed and (lang not in self.allowed or prob < 0.5):
            ranked = [code for code, _ in probs if code in self.allowed]
            better = ranked[0] if ranked else self.allowed[0]
            if better != lang:
                text, lang, _, _ = self._run(audio, better)
        if is_hallucination(text):
            return None
        return Speech(text=text, lang=lang)

    def _run(self, audio: np.ndarray, language: str | None):
        segments, info = self.model.transcribe(
            audio,
            language=language,
            beam_size=1,
            vad_filter=True,
            condition_on_previous_text=False,
            without_timestamps=True,
        )
        parts = [s.text.strip() for s in segments if s.no_speech_prob < 0.6]
        probs = sorted(info.all_language_probs or [], key=lambda x: -x[1])
        text = ' '.join(p for p in parts if p).strip()
        return text, info.language, info.language_probability, probs
