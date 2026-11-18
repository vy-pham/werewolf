"""Worker configuration, read from environment variables (see README)."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

Device = Literal['auto', 'cpu', 'cuda']


@dataclass(frozen=True)
class Settings:
    # Game server (apps/server). The secret must equal the server's CAPTIONS_SECRET.
    server_url: str
    secret: str
    poll_seconds: float = 3.0

    # Speech-to-text (faster-whisper). Model: tiny | base | small | medium | large-v3-turbo ...
    whisper_model: str = 'small'
    device: Device = 'auto'
    # Languages captions are produced for (= server CAPTION_LANGS). Speech detected in another
    # language is re-decoded as the most likely of these.
    caption_langs: tuple[str, ...] = ('en', 'vi')

    # Translation: 'nllb' (local NLLB-200 via CTranslate2) or 'none'.
    translator: Literal['nllb', 'none'] = 'nllb'
    nllb_model: str = 'JustFrederik/nllb-200-distilled-600M-ct2-int8'

    # Where models are downloaded (default: the Hugging Face cache).
    model_dir: str | None = None
    # Segments still waiting longer than this are dropped: late captions are useless.
    max_lag_seconds: float = 8.0

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env
        secret = env.get('CAPTIONS_SECRET', '')
        if len(secret) < 16:
            raise ValueError('CAPTIONS_SECRET must be set (16+ chars, same as the server)')
        translator = env.get('TRANSLATOR', 'nllb')
        if translator not in ('nllb', 'none'):
            raise ValueError(f'TRANSLATOR must be nllb or none, got {translator!r}')
        device = env.get('DEVICE', 'auto')
        if device not in ('auto', 'cpu', 'cuda'):
            raise ValueError(f'DEVICE must be auto, cpu or cuda, got {device!r}')
        langs = tuple(x.strip() for x in env.get('CAPTION_LANGS', 'en,vi').split(',') if x.strip())
        return cls(
            server_url=env.get('SERVER_URL', 'http://127.0.0.1:4000').rstrip('/'),
            secret=secret,
            poll_seconds=float(env.get('POLL_SECONDS', '3')),
            whisper_model=env.get('WHISPER_MODEL', 'small'),
            device=device,  # type: ignore[arg-type]
            caption_langs=langs,
            translator=translator,  # type: ignore[arg-type]
            nllb_model=env.get('NLLB_MODEL', cls.nllb_model),
            model_dir=env.get('MODEL_DIR') or None,
            max_lag_seconds=float(env.get('MAX_LAG_SECONDS', '8')),
        )


def resolve_device(device: Device) -> Literal['cpu', 'cuda']:
    if device != 'auto':
        return device
    try:
        import ctranslate2

        return 'cuda' if ctranslate2.get_cuda_device_count() > 0 else 'cpu'
    except Exception:
        return 'cpu'
