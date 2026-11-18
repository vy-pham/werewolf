"""Translation with NLLB-200 (distilled 600M) on CTranslate2. Swap via the Translator protocol."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Protocol

log = logging.getLogger(__name__)

# ISO 639-1 → NLLB (FLORES-200) codes. Extend together with the server's CAPTION_LANGS.
NLLB_CODES = {
    'en': 'eng_Latn',
    'vi': 'vie_Latn',
    'fr': 'fra_Latn',
    'es': 'spa_Latn',
    'de': 'deu_Latn',
    'id': 'ind_Latn',
    'th': 'tha_Thai',
    'ja': 'jpn_Jpan',
    'ko': 'kor_Hang',
    'zh': 'zho_Hans',
}


class Translator(Protocol):
    def translate(self, text: str, source: str, targets: list[str]) -> dict[str, str]:
        """Translations of `text` into each target language (the source itself is skipped)."""
        ...


class NoTranslator:
    def translate(self, text: str, source: str, targets: list[str]) -> dict[str, str]:
        return {}


class NllbTranslator:
    def __init__(self, translator: Any, tokenizer: Any) -> None:
        self.translator = translator
        self.sp = tokenizer

    @classmethod
    def load(cls, model: str, device: str, cache_dir: str | None = None) -> NllbTranslator:
        import ctranslate2
        import sentencepiece
        from huggingface_hub import snapshot_download

        local = Path(model)
        path = local if local.is_dir() else Path(snapshot_download(model, cache_dir=cache_dir))
        log.info('loading NLLB from %s on %s', path, device)
        translator = ctranslate2.Translator(
            str(path), device=device, compute_type='int8_float16' if device == 'cuda' else 'int8'
        )
        sp = sentencepiece.SentencePieceProcessor(model_file=str(path / 'sentencepiece.bpe.model'))
        return cls(translator, sp)

    def translate(self, text: str, source: str, targets: list[str]) -> dict[str, str]:
        src = NLLB_CODES.get(source)
        wanted = [t for t in dict.fromkeys(targets) if t != source and t in NLLB_CODES]
        if not src or not wanted:
            return {}
        tokens = [src, *self.sp.encode(text, out_type=str), '</s>']
        results = self.translator.translate_batch(
            [tokens] * len(wanted),
            target_prefix=[[NLLB_CODES[t]] for t in wanted],
            beam_size=2,
            max_decoding_length=256,
        )
        out: dict[str, str] = {}
        for lang, result in zip(wanted, results, strict=True):
            # The first token of the hypothesis is the target language code.
            out[lang] = self.sp.decode(result.hypotheses[0][1:]).strip()
        return out
