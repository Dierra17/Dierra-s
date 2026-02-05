import asyncio
import os

from dotenv import load_dotenv
from openai import OpenAI
from telethon import TelegramClient

from llm import extract_with_llm
from supabase_client import (
    get_client,
    get_last_message_id,
    get_or_create_brand,
    resize_image_if_needed,
    upsert_ingest_state,
    upsert_pin,
    upsert_telegram_post,
    upload_image,
)
from telegram import fetch_channel_messages


def get_env(name: str, default: str = '') -> str:
    val = os.getenv(name, default)
    if not val:
        raise RuntimeError(f'Missing env variable: {name}')
    return val


async def main():
    load_dotenv()

    channel = os.getenv('TELEGRAM_CHANNEL', 'madeinrussia')
    api_id = int(get_env('TELEGRAM_API_ID'))
    api_hash = get_env('TELEGRAM_API_HASH')
    session = get_env('TELEGRAM_SESSION')

    sb = get_client(get_env('SUPABASE_URL'), get_env('SUPABASE_SERVICE_ROLE_KEY'))
    openai_client = OpenAI(api_key=get_env('OPENAI_API_KEY'))
    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    threshold = float(os.getenv('LLM_CONFIDENCE_THRESHOLD', '0.7'))
    bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'pins')

    last_message_id = get_last_message_id(sb, channel)

    async with TelegramClient(session, api_id, api_hash) as tg_client:
        posts = await fetch_channel_messages(tg_client, channel, last_message_id=last_message_id, limit=500)

    new_last_message_id = last_message_id

    for post in posts:
        llm_result = extract_with_llm(openai_client, model, post.text)
        confidence = float(llm_result.get('confidence') or 0)
        status = 'published' if confidence >= threshold else 'pending_low_confidence'

        post_id = upsert_telegram_post(
            sb,
            {
                'channel': post.channel,
                'message_id': post.message_id,
                'post_url': post.post_url,
                'text': post.text,
                'hashtags': post.hashtags,
                'links': post.links,
                'posted_at': post.posted_at.isoformat(),
            },
        )

        brand_id = None
        if llm_result.get('brand_name'):
            brand_id = get_or_create_brand(sb, llm_result['brand_name'])

        for photo in post.photos:
            image_bytes = resize_image_if_needed(photo.bytes_data, max_width=1600)
            storage_path = f"{post.channel}/{post.message_id}/{photo.idx}.jpg"
            public_url = upload_image(sb, bucket, storage_path, image_bytes)

            upsert_pin(
                sb,
                {
                    'telegram_post_id': post_id,
                    'brand_id': brand_id,
                    'image_url': public_url,
                    'image_storage_path': storage_path,
                    'short_title': llm_result.get('short_title'),
                    'description': post.text,
                    'tags': llm_result.get('tags', []),
                    'status': status,
                    'llm_confidence': confidence,
                    'posted_at': post.posted_at.isoformat(),
                },
            )

        new_last_message_id = max(new_last_message_id, post.message_id)

    upsert_ingest_state(sb, channel, new_last_message_id)
    print(f'Processed posts: {len(posts)}; new_last_message_id={new_last_message_id}')


if __name__ == '__main__':
    asyncio.run(main())
