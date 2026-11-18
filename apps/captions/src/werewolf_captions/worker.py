"""LiveKit side: join the rooms the server lists, cut every audio track into utterances."""

from __future__ import annotations

import asyncio
import contextlib
import logging

import numpy as np
from livekit import rtc

from .pipeline import CaptionPipeline, Utterance
from .segmenter import SAMPLE_RATE, Segmenter
from .server_api import ServerApi

log = logging.getLogger(__name__)


class RoomListener:
    """One LiveKit room, joined as a hidden listen-only participant.

    The server enforces who may *publish* in each room (turn-based speech), so every track the
    worker receives is audio somebody was allowed to say; the server again decides who may read
    the caption.
    """

    def __init__(self, name: str, pipeline: CaptionPipeline) -> None:
        self.name = name
        self.pipeline = pipeline
        self.room = rtc.Room()
        self.tasks: dict[str, asyncio.Task[None]] = {}
        self.closed = asyncio.Event()

        self.room.on('track_subscribed', self._on_track)
        self.room.on('track_unsubscribed', self._on_untrack)
        self.room.on('disconnected', lambda *_: self.closed.set())

    async def connect(self, url: str, token: str) -> None:
        await self.room.connect(url, token, rtc.RoomOptions(auto_subscribe=True))
        log.info('joined %s', self.name)

    async def close(self) -> None:
        for task in self.tasks.values():
            task.cancel()
        await asyncio.gather(*self.tasks.values(), return_exceptions=True)
        self.tasks.clear()
        with contextlib.suppress(Exception):
            await self.room.disconnect()
        self.pipeline.forget_room(self.name)
        self.closed.set()
        log.info('left %s', self.name)

    def _on_track(
        self,
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return
        self.tasks[publication.sid] = asyncio.create_task(
            self._listen(track, participant.identity), name=f'{self.name}/{participant.identity}'
        )

    def _on_untrack(
        self,
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        task = self.tasks.pop(publication.sid, None)
        if task:
            task.cancel()

    async def _listen(self, track: rtc.Track, speaker: str) -> None:
        segmenter = Segmenter()
        stream = rtc.AudioStream(track, sample_rate=SAMPLE_RATE, num_channels=1)
        try:
            async for event in stream:
                pcm = np.frombuffer(event.frame.data, dtype=np.int16)
                for audio in segmenter.push(pcm):
                    self.pipeline.submit(Utterance(self.name, speaker, audio))
        finally:
            # Track gone (mic muted, permission revoked, left): caption what was said so far.
            tail = segmenter.flush()
            if tail is not None:
                self.pipeline.submit(Utterance(self.name, speaker, tail))
            with contextlib.suppress(Exception):
                await stream.aclose()


class Worker:
    """Polls the server for rooms with captions on and keeps one listener per room."""

    def __init__(self, api: ServerApi, pipeline: CaptionPipeline, poll_seconds: float) -> None:
        self.api = api
        self.pipeline = pipeline
        self.poll_seconds = poll_seconds
        self.listeners: dict[str, RoomListener] = {}

    async def run(self) -> None:
        consumer = asyncio.create_task(self.pipeline.run(), name='pipeline')
        try:
            while True:
                try:
                    await self.reconcile()
                except Exception as error:
                    log.warning('poll failed: %s', error)
                await asyncio.sleep(self.poll_seconds)
        finally:
            consumer.cancel()
            await asyncio.gather(*(lst.close() for lst in self.listeners.values()))

    async def reconcile(self) -> None:
        url, tickets = await self.api.rooms()
        wanted = {t.room: t.token for t in tickets}
        # Drop listeners whose room closed or that LiveKit disconnected (rejoined below).
        for name, listener in list(self.listeners.items()):
            if name not in wanted or listener.closed.is_set():
                del self.listeners[name]
                await listener.close()
        for name, token in wanted.items():
            if name in self.listeners:
                continue
            listener = RoomListener(name, self.pipeline)
            try:
                await listener.connect(url, token)
            except Exception as error:
                log.warning('cannot join %s: %s', name, error)
                continue
            self.listeners[name] = listener
