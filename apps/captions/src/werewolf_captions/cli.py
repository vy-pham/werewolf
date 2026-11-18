"""Entry point.

werewolf-captions run              # the worker (default)
werewolf-captions download         # pre-download models (Docker build, first setup)
werewolf-captions try audio.wav    # transcribe + translate a file, no server needed
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import logging
import os
import sys
import time

from .config import Settings, resolve_device

log = logging.getLogger('werewolf_captions')


def _models(settings: Settings):
    """Loads STT + translator. `DEVICE=auto` uses the GPU only if inference really works there
    (CUDA present but cuBLAS/cuDNN missing is common on Windows), else falls back to CPU."""
    import numpy as np

    from .stt import WhisperSTT
    from .translate import NllbTranslator, NoTranslator

    device = resolve_device(settings.device)

    def load_stt(dev: str) -> WhisperSTT:
        stt = WhisperSTT(
            settings.whisper_model, dev, settings.caption_langs, download_root=settings.model_dir
        )
        stt.transcribe(np.zeros(16_000, dtype=np.float32))  # warm-up (and GPU check)
        return stt

    try:
        stt = load_stt(device)
    except RuntimeError as error:
        if settings.device != 'auto' or device == 'cpu':
            raise
        log.warning('GPU inference unavailable (%s): using CPU', error)
        device = 'cpu'
        stt = load_stt(device)
    translator = (
        NllbTranslator.load(settings.nllb_model, device, cache_dir=settings.model_dir)
        if settings.translator == 'nllb'
        else NoTranslator()
    )
    return stt, translator, device


async def _run(settings: Settings) -> None:
    from .pipeline import CaptionPipeline
    from .server_api import ServerApi
    from .worker import Worker

    stt, translator, _ = _models(settings)
    api = ServerApi(settings.server_url, settings.secret)
    pipeline = CaptionPipeline(
        stt, translator, api.post_caption, settings.caption_langs, settings.max_lag_seconds
    )
    log.info('captions worker ready, polling %s', settings.server_url)
    try:
        await Worker(api, pipeline, settings.poll_seconds).run()
    finally:
        await api.close()


def _try(path: str) -> None:
    import av
    import numpy as np

    # The file is only decoded locally; models do not need the server.
    settings = Settings.from_env({**os.environ, 'CAPTIONS_SECRET': 'x' * 16})
    stt, translator, device = _models(settings)
    with av.open(path) as container:
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16_000)
        chunks = [
            r.to_ndarray().reshape(-1)
            for frame in container.decode(audio=0)
            for r in resampler.resample(frame)
        ]
    audio = np.concatenate(chunks).astype(np.float32) / 32768.0
    started = time.perf_counter()
    speech = stt.transcribe(audio)
    stt_s = time.perf_counter() - started
    if speech is None:
        print('(no speech)')
        return
    targets = [x for x in settings.caption_langs if x != speech.lang]
    started = time.perf_counter()
    translations = translator.translate(speech.text, speech.lang, targets)
    mt_s = time.perf_counter() - started
    print(f'[{speech.lang}] {speech.text}')
    for lang, text in translations.items():
        print(f'[{lang}] {text}')
    print(f'{len(audio) / 16000:.1f}s audio · stt {stt_s:.2f}s · mt {mt_s:.2f}s · {device}')


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog='werewolf-captions')
    sub = parser.add_subparsers(dest='cmd')
    run_cmd = sub.add_parser('run', help='run the worker (default)')
    run_cmd.add_argument(
        '--dev', action='store_true', help='use the dev secret of `pnpm dev:local` if unset'
    )
    sub.add_parser('download', help='download the models and exit')
    try_cmd = sub.add_parser('try', help='transcribe + translate an audio file')
    try_cmd.add_argument('file')
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=os.environ.get('LOG_LEVEL', 'INFO').upper(),
        format='%(asctime)s %(levelname)s %(name)s: %(message)s',
        stream=sys.stdout,
    )
    for noisy in ('httpx', 'httpx2', 'httpcore', 'huggingface_hub', 'faster_whisper'):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    # libwebrtc logs every failed ICE candidate (virtual network adapters...) as an ERROR.
    # Connection failures still surface as exceptions in the worker's own log.
    if os.environ.get('LOG_LEVEL', 'INFO').upper() != 'DEBUG':
        logging.getLogger('livekit').setLevel(logging.CRITICAL)
    if args.cmd == 'download':
        settings = Settings.from_env({**os.environ, 'CAPTIONS_SECRET': 'x' * 16, 'DEVICE': 'cpu'})
        _models(settings)
        log.info('models ready')
    elif args.cmd == 'try':
        _try(args.file)
    else:
        if getattr(args, 'dev', False):
            os.environ.setdefault('CAPTIONS_SECRET', 'dev-captions-secret')
        with contextlib.suppress(KeyboardInterrupt):
            asyncio.run(_run(Settings.from_env()))


if __name__ == '__main__':
    main()
