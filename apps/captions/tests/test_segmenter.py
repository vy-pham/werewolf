import numpy as np

from werewolf_captions.segmenter import SAMPLE_RATE, Segmenter, SegmenterConfig

rng = np.random.default_rng(0)


def noise(seconds: float, level: float = 0.002) -> np.ndarray:
    return (rng.standard_normal(int(SAMPLE_RATE * seconds)) * level).astype(np.float32)


def voice(seconds: float, level: float = 0.2) -> np.ndarray:
    t = np.arange(int(SAMPLE_RATE * seconds)) / SAMPLE_RATE
    return (np.sin(2 * np.pi * 220 * t) * level).astype(np.float32) + noise(seconds)


def feed(seg: Segmenter, audio: np.ndarray, chunk: int = 480) -> list[np.ndarray]:
    """Pushes in 30 ms chunks like LiveKit frames (not aligned with the 20 ms analysis frames)."""
    out: list[np.ndarray] = []
    for i in range(0, len(audio), chunk):
        out += seg.push(audio[i : i + chunk])
    return out


def test_two_sentences_separated_by_a_pause():
    seg = Segmenter()
    audio = np.concatenate([noise(1), voice(1.5), noise(1), voice(2), noise(1)])
    out = feed(seg, audio)
    assert len(out) == 2
    # speech + preroll + trailing silence
    assert 1.5 <= len(out[0]) / SAMPLE_RATE <= 2.5
    assert 2.0 <= len(out[1]) / SAMPLE_RATE <= 3.0


def test_silence_produces_nothing():
    seg = Segmenter()
    assert feed(seg, noise(5)) == []
    assert seg.flush() is None


def test_steady_noise_stops_counting_as_speech():
    seg = Segmenter()
    feed(seg, noise(2))
    # A fan starts: at most one false utterance (Whisper's own VAD drops it), then nothing.
    assert len(feed(seg, noise(8, level=0.05))) <= 1
    seg.flush()
    assert feed(seg, noise(5, level=0.05)) == []
    assert seg.flush() is None


def test_clicks_are_dropped():
    seg = Segmenter()
    assert feed(seg, np.concatenate([noise(1), voice(0.1), noise(1)])) == []


def test_long_monologue_is_cut():
    seg = Segmenter(SegmenterConfig(max_segment_ms=3000))
    out = feed(seg, np.concatenate([noise(0.5), voice(7), noise(1)]))
    assert len(out) >= 2
    assert all(len(x) / SAMPLE_RATE <= 3.01 for x in out)


def test_flush_returns_unfinished_utterance():
    seg = Segmenter()
    assert feed(seg, np.concatenate([noise(0.5), voice(1)])) == []
    tail = seg.flush()
    assert tail is not None and len(tail) / SAMPLE_RATE >= 0.9
    assert seg.flush() is None


def test_accepts_int16():
    seg = Segmenter()
    audio = np.concatenate([noise(0.5), voice(1), noise(1)])
    out = feed(seg, (audio * 32767).astype(np.int16))
    assert len(out) == 1 and out[0].dtype == np.float32
