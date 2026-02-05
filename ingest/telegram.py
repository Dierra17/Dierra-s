import re
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from telethon import TelegramClient
from telethon.tl.types import Message

ALLOWED_HASHTAGS = {
    'drop', 'brand', 'art', 'home',
    'drop@madeinrussia', 'brand@madeinrussia', 'art@madeinrussia'
}

HASHTAG_RE = re.compile(r'#([\w@]+)', re.IGNORECASE)
URL_RE = re.compile(r'https?://[^\s)\]>]+', re.IGNORECASE)


@dataclass
class PhotoItem:
    idx: int
    bytes_data: bytes


@dataclass
class ParsedPost:
    channel: str
    message_id: int
    post_url: str
    text: str
    hashtags: List[str]
    links: List[str]
    posted_at: datetime
    photos: List[PhotoItem]


def normalize_hashtag(tag: str) -> str:
    return tag.lower().strip()


def extract_hashtags(text: str) -> List[str]:
    found = [normalize_hashtag(v) for v in HASHTAG_RE.findall(text or '')]
    unique: List[str] = []
    for v in found:
      if v not in unique:
        unique.append(v)
    return unique


def is_relevant(hashtags: List[str]) -> bool:
    return any(tag in ALLOWED_HASHTAGS for tag in hashtags)


def extract_links(text: str) -> List[str]:
    links = [m.group(0).rstrip('.,;!') for m in URL_RE.finditer(text or '')]
    dedup: List[str] = []
    for link in links:
        if link not in dedup:
            dedup.append(link)
    return dedup


async def fetch_channel_messages(
    client: TelegramClient,
    channel_username: str,
    last_message_id: int,
    limit: int = 500,
) -> List[ParsedPost]:
    raw_messages: List[Message] = []
    async for msg in client.iter_messages(channel_username, limit=limit):
        if msg.id <= last_message_id:
            continue
        raw_messages.append(msg)

    grouped: Dict[int, List[Message]] = {}
    for msg in raw_messages:
        gid = getattr(msg, 'grouped_id', None)
        if gid:
            grouped.setdefault(gid, []).append(msg)

    parsed: List[ParsedPost] = []
    processed_album_ids = set()

    for msg in raw_messages:
        gid = getattr(msg, 'grouped_id', None)
        if gid and gid in processed_album_ids:
            continue

        messages_scope = grouped[gid] if gid else [msg]
        processed_album_ids.add(gid) if gid else None

        caption = ''
        for m in messages_scope:
            if m.message:
                caption = m.message
                break

        hashtags = extract_hashtags(caption)
        if not is_relevant(hashtags):
            continue

        links = extract_links(caption)
        photos: List[PhotoItem] = []
        for idx, m in enumerate(messages_scope):
            if not m.photo:
                continue
            blob = await client.download_media(m, bytes)
            if blob:
                photos.append(PhotoItem(idx=idx, bytes_data=blob))

        if not photos:
            continue

        post_anchor = min([m.id for m in messages_scope])
        post_url = f'https://t.me/{channel_username}/{post_anchor}'

        parsed.append(
            ParsedPost(
                channel=channel_username,
                message_id=post_anchor,
                post_url=post_url,
                text=caption or '',
                hashtags=hashtags,
                links=links,
                posted_at=msg.date,
                photos=photos,
            )
        )

    return sorted(parsed, key=lambda x: x.message_id)
