"""Cuts a live audio stream into utterances (one per sentence-ish), using signal energy.

Lightweight on purpose (no torch): Whisper runs its own Silero VAD (ONNX) on each segment to
trim non-speech, so this only needs to find pauses. The noise floor adapts per speaker, so a
noisy microphone does not count as speech forever.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

SAMPLE_RATE = 16_000


@dataclass(frozen=True)
class SegmenterConfig:
    frame_ms: int = 20
    # A frame is speech when it is this much louder than the noise floor...
    margin_db: float = 12.0
    # ...and louder than this absolute level (dBFS).
    min_speech_db: float = -48.0
    # Consecutive speech frames needed to start an utterance.
    start_frames: int = 3
    # Silence that ends an utterance.
    end_silence_ms: int = 600
    # Audio kept before the detected start (soft consonants).
    preroll_ms: int = 200
    # Longer utterances are cut here (captions should not wait for a monologue to end).
    max_segment_ms: int = 8_000
    # Shorter utterances (coughs, clicks) are dropped.
    min_speech_ms: int = 300


def frame_db(frame: np.ndarray) -> float:
    """RMS level of a float32 frame in dBFS."""
    rms = float(np.sqrt(np.mean(np.square(frame), dtype=np.float64)))
    return 20.0 * np.log10(max(rms, 1e-9))


class Segmenter:
    """Feed 16 kHz mono PCM of any chunk size; get finished utterances back (float32 -1..1)."""

    def __init__(self, config: SegmenterConfig | None = None) -> None:
        self.cfg = config or SegmenterConfig()
        self.frame_len = SAMPLE_RATE * self.cfg.frame_ms // 1000
        self._pending = np.zeros(0, dtype=np.float32)
        self._noise_db = -60.0
        self._preroll: list[np.ndarray] = []
        self._run = 0  # consecutive speech frames while idle
        self._active = False
        self._frames: list[np.ndarray] = []
        self._speech_frames = 0
        self._silence_frames = 0

    def push(self, pcm: np.ndarray) -> list[np.ndarray]:
        """Adds int16 or float32 samples; returns the utterances completed by them."""
        samples = pcm.astype(np.float32) / 32768.0 if pcm.dtype == np.int16 else pcm
        self._pending = np.concatenate([self._pending, samples.astype(np.float32, copy=False)])
        done: list[np.ndarray] = []
        while len(self._pending) >= self.frame_len:
            frame = self._pending[: self.frame_len]
            self._pending = self._pending[self.frame_len :]
            segment = self._frame(frame)
            if segment is not None:
                done.append(segment)
        return done

    def flush(self) -> np.ndarray | None:
        """Ends the current utterance (track ended / speaker lost the floor)."""
        return self._finish() if self._active else None

    # ── internals ────────────────────────────────────────────────────────────

    def _frame(self, frame: np.ndarray) -> np.ndarray | None:
        cfg = self.cfg
        db = frame_db(frame)
        speech = db > max(self._noise_db + cfg.margin_db, cfg.min_speech_db)
        # Track the noise floor: fast down, slow up, and very slowly up even during "speech",
        # so steady background noise that suddenly appears (a fan) stops counting after ~4 s.
        if db < self._noise_db:
            rate = 0.3
        else:
            rate = 0.003 if speech else 0.02
        self._noise_db += rate * (db - self._noise_db)

        if not self._active:
            self._preroll.append(frame)
            max_pre = max(1, cfg.preroll_ms // cfg.frame_ms) + cfg.start_frames
            if len(self._preroll) > max_pre:
                self._preroll.pop(0)
            self._run = self._run + 1 if speech else 0
            if self._run >= cfg.start_frames:
                self._active = True
                self._frames = list(self._preroll)
                self._speech_frames = self._run
                self._silence_frames = 0
                self._preroll = []
            return None

        self._frames.append(frame)
        if speech:
            self._speech_frames += 1
            self._silence_frames = 0
        else:
            self._silence_frames += 1
        if self._silence_frames * cfg.frame_ms >= cfg.end_silence_ms:
            return self._finish()
        if len(self._frames) * cfg.frame_ms >= cfg.max_segment_ms:
            return self._finish()
        return None

    def _finish(self) -> np.ndarray | None:
        frames, speech = self._frames, self._speech_frames
        self._active = False
        self._frames = []
        self._run = 0
        self._speech_frames = 0
        self._silence_frames = 0
        if speech * self.cfg.frame_ms < self.cfg.min_speech_ms:
            return None
        return np.concatenate(frames)
