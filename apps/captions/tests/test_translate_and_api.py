import json
from types import SimpleNamespace

import httpx
import pytest

from werewolf_captions.config import Settings
from werewolf_captions.server_api import Caption, ServerApi
from werewolf_captions.translate import NllbTranslator


class FakeSp:
    def encode(self, text, out_type=str):
        return text.split()

    def decode(self, tokens):
        return ' '.join(tokens)


class FakeCt2:
    def __init__(self) -> None:
        self.calls = []

    def translate_batch(self, batch, target_prefix, **_):
        self.calls.append((batch, target_prefix))
        return [SimpleNamespace(hypotheses=[[p[0], 'hello', 'world']]) for p in target_prefix]


def test_nllb_builds_language_tagged_inputs():
    ct2 = FakeCt2()
    out = NllbTranslator(ct2, FakeSp()).translate('xin chào', 'vi', ['en', 'vi', 'en', 'xx'])
    assert out == {'en': 'hello world'}
    batch, prefix = ct2.calls[0]
    assert batch == [['vie_Latn', 'xin', 'chào', '</s>']]
    assert prefix == [['eng_Latn']]


def test_nllb_skips_unknown_source():
    ct2 = FakeCt2()
    assert NllbTranslator(ct2, FakeSp()).translate('hej', 'sv', ['en']) == {}
    assert ct2.calls == []


async def test_server_api_sends_secret_and_parses():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path == '/internal/captions/rooms':
            return httpx.Response(
                200, json={'url': 'ws://lk', 'rooms': [{'room': 'r1', 'token': 't1'}]}
            )
        return httpx.Response(200, json={'delivered': 2, 'wanted': ['vi']})

    client = httpx.AsyncClient(base_url='http://server', transport=httpx.MockTransport(handler))
    api = ServerApi('http://server', 'secret-secret-secret', client)
    url, rooms = await api.rooms()
    assert url == 'ws://lk' and rooms[0].room == 'r1' and rooms[0].token == 't1'
    wanted = await api.post_caption(Caption('r1', 'u1', 'vi', 'xin chào', {'en': 'hello'}))
    assert wanted == ['vi']
    assert all(r.headers['authorization'] == 'Bearer secret-secret-secret' for r in seen)
    assert json.loads(seen[1].content) == {
        'room': 'r1',
        'speakerId': 'u1',
        'lang': 'vi',
        'text': 'xin chào',
        'translations': {'en': 'hello'},
    }
    await api.close()


def test_settings_from_env():
    env = {'CAPTIONS_SECRET': 'x' * 16, 'CAPTION_LANGS': 'vi, en ,', 'TRANSLATOR': 'none'}
    s = Settings.from_env(env)
    assert s.caption_langs == ('vi', 'en') and s.translator == 'none'
    assert s.server_url == 'http://127.0.0.1:4000'
    with pytest.raises(ValueError, match='CAPTIONS_SECRET'):
        Settings.from_env({})
    with pytest.raises(ValueError, match='DEVICE'):
        Settings.from_env({'CAPTIONS_SECRET': 'x' * 16, 'DEVICE': 'tpu'})
