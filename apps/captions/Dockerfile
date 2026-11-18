# Captions worker (docs/03-technical-design.md §7). Models are baked into the image so the
# container starts without downloading ~1 GB. Build from this folder: docker build -t captions .
FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.9.1 /uv /usr/local/bin/uv

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    HF_HOME=/models \
    DEVICE=cpu

WORKDIR /app

# Dependencies first (cached unless pyproject/uv.lock change).
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project
COPY src ./src
RUN uv sync --frozen --no-dev

# Whisper model: small (default) | base (faster, weaker Vietnamese) | large-v3-turbo (GPU).
ARG WHISPER_MODEL=small
ENV WHISPER_MODEL=${WHISPER_MODEL}
RUN uv run --no-sync werewolf-captions download

RUN useradd --create-home worker && chown -R worker /models
USER worker

# Needs: SERVER_URL, CAPTIONS_SECRET. Only outbound connections (server API + LiveKit).
CMD ["uv", "run", "--no-sync", "werewolf-captions", "run"]
