"""Client of the game server's internal captions API (apps/server modules/captions)."""

from __future__ import annotations

from dataclasses import dataclass

import httpx


@dataclass(frozen=True)
class RoomTicket:
    room: str
    token: str


@dataclass(frozen=True)
class Caption:
    room: str
    speaker_id: str
    lang: str
    text: str
    translations: dict[str, str]


class ServerApi:
    def __init__(self, base_url: str, secret: str, client: httpx.AsyncClient | None = None) -> None:
        self.client = client or httpx.AsyncClient(base_url=base_url, timeout=10)
        self.client.headers['authorization'] = f'Bearer {secret}'

    async def rooms(self) -> tuple[str, list[RoomTicket]]:
        """LiveKit URL + the rooms to listen to (with listen-only tokens)."""
        res = await self.client.get('/internal/captions/rooms')
        res.raise_for_status()
        body = res.json()
        return body['url'], [RoomTicket(r['room'], r['token']) for r in body['rooms']]

    async def post_caption(self, caption: Caption) -> list[str]:
        """Sends one sentence; returns the caption languages the room's listeners want."""
        res = await self.client.post(
            '/internal/captions',
            json={
                'room': caption.room,
                'speakerId': caption.speaker_id,
                'lang': caption.lang,
                'text': caption.text,
                'translations': caption.translations,
            },
        )
        res.raise_for_status()
        return list(res.json().get('wanted', []))

    async def close(self) -> None:
        await self.client.aclose()
