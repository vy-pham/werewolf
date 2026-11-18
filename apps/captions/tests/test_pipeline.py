import asyncio

import numpy as np
import pytest

from werewolf_captions.pipeline import CaptionPipeline, Utterance
from werewolf_captions.server_api import Caption
from werewolf_captions.stt import Speech, is_hallucination

HELLO = Speech('xin chào', 'vi')


class FakeStt:
    def __init__(self, result: Speech | None = HELLO) -> None:
        self.result = result
        self.hints: list[str | None] = []

    def transcribe(self, audio, previous_lang=None):
        self.hints.append(previous_lang)
        return self.result


class FakeTranslator:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, list[str]]] = []

    def translate(self, text, source, targets):
        self.calls.append((text, source, targets))
        return {t: f'{text}@{t}' for t in targets if t != source}


class FakeSink:
    def __init__(self, wanted: list[str]) -> None:
        self.captions: list[Caption] = []
        self.wanted = wanted

    async def __call__(self, caption: Caption) -> list[str]:
        self.captions.append(caption)
        return self.wanted


def utterance(room='game-x-main', speaker='u1', queued_at=0.0) -> Utterance:
    return Utterance(room, speaker, np.zeros(16_000, dtype=np.float32), queued_at)


def make(stt=None, sink=None, now=0.0, max_queue=32):
    stt = stt or FakeStt()
    translator = FakeTranslator()
    sink = sink or FakeSink(['en', 'vi'])
    pipe = CaptionPipeline(
        stt, translator, sink, ('en', 'vi'), max_lag=5, max_queue=max_queue, clock=lambda: now
    )
    return pipe, stt, translator, sink


async def test_transcribes_translates_and_posts():
    pipe, _, translator, sink = make()
    caption = await pipe.process(utterance())
    assert caption == Caption('game-x-main', 'u1', 'vi', 'xin chào', {'en': 'xin chào@en'})
    assert sink.captions == [caption]
    assert translator.calls == [('xin chào', 'vi', ['en', 'vi'])]


async def test_translates_only_into_languages_the_room_wants():
    pipe, _, translator, _ = make(sink=FakeSink(['vi']))
    await pipe.process(utterance())
    await pipe.process(utterance())
    assert translator.calls[1][2] == ['vi']  # second time: only what listeners asked for
    assert pipe.wanted['game-x-main'] == ['vi']
    pipe.forget_room('game-x-main')
    assert 'game-x-main' not in pipe.wanted


async def test_remembers_the_speakers_language_and_redetects_periodically():
    pipe, stt, _, _ = make()
    for _ in range(7):
        await pipe.process(utterance(speaker='a'))
    await pipe.process(utterance(speaker='b'))
    assert stt.hints == [None, 'vi', 'vi', 'vi', 'vi', 'vi', None, None]


async def test_silence_is_not_posted():
    pipe, _, _, sink = make(stt=FakeStt(None))
    assert await pipe.process(utterance()) is None
    assert sink.captions == [] and pipe.stats['silent'] == 1


async def test_stale_utterances_are_skipped():
    pipe, stt, _, sink = make(now=100.0)
    assert await pipe.process(utterance(queued_at=90.0)) is None
    assert stt.hints == [] and sink.captions == [] and pipe.stats['stale'] == 1


async def test_full_queue_drops_the_oldest():
    pipe, *_ = make(max_queue=2)
    for i in range(3):
        pipe.submit(utterance(speaker=f's{i}'))
    assert pipe.stats['dropped'] == 1
    assert [pipe.queue.get_nowait().speaker_id for _ in range(2)] == ['s1', 's2']


async def test_run_survives_errors():
    class Boom:
        def transcribe(self, *_):
            raise RuntimeError('model crashed')

    pipe, *_ = make(stt=Boom())
    task = asyncio.create_task(pipe.run())
    pipe.submit(utterance())
    for _ in range(100):
        if pipe.stats['errors']:
            break
        await asyncio.sleep(0.01)
    assert pipe.stats['errors'] == 1 and not task.done()
    task.cancel()


@pytest.mark.parametrize(
    ('text', 'expected'),
    [('Thank you.', True), ('...', True), ('', True), ('Tôi là dân làng', False)],
)
def test_hallucination_filter(text, expected):
    assert is_hallucination(text) is expected
