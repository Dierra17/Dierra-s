from io import BytesIO
import re
from typing import Dict

from PIL import Image
from slugify import slugify
from supabase import Client, create_client


def normalize_brand_name(name: str) -> str:
    cleaned = (name or '').lower().strip()
    cleaned = re.sub(r'["\'«»`]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned


def get_client(url: str, service_role_key: str) -> Client:
    return create_client(url, service_role_key)


def get_last_message_id(sb: Client, channel: str) -> int:
    data = sb.table('ingest_state').select('last_message_id').eq('channel', channel).limit(1).execute().data
    if not data:
        return 0
    return int(data[0]['last_message_id'])


def upsert_ingest_state(sb: Client, channel: str, last_message_id: int) -> None:
    sb.table('ingest_state').upsert({'channel': channel, 'last_message_id': last_message_id}, on_conflict='channel').execute()


def upsert_telegram_post(sb: Client, post: Dict) -> str:
    response = sb.table('telegram_posts').upsert(post, on_conflict='channel,message_id').execute()
    if response.data:
        return response.data[0]['id']
    selected = sb.table('telegram_posts').select('id').eq('channel', post['channel']).eq('message_id', post['message_id']).single().execute()
    return selected.data['id']


def get_or_create_brand(sb: Client, brand_name: str) -> str:
    normalized = normalize_brand_name(brand_name)
    existing = sb.table('brands').select('id').eq('name_normalized', normalized).maybe_single().execute().data
    if existing and existing.get('id'):
        return existing['id']

    base_slug = slugify(brand_name or 'brand', lowercase=True)
    slug = base_slug
    suffix = 1
    while True:
        try:
            inserted = sb.table('brands').insert(
                {'name': brand_name or 'Без названия', 'name_normalized': normalized, 'slug': slug}
            ).execute()
            return inserted.data[0]['id']
        except Exception:
            suffix += 1
            slug = f'{base_slug}-{suffix}'


def resize_image_if_needed(raw_bytes: bytes, max_width: int = 1600) -> bytes:
    image = Image.open(BytesIO(raw_bytes)).convert('RGB')
    if image.width > max_width:
        ratio = max_width / float(image.width)
        new_size = (max_width, int(image.height * ratio))
        image = image.resize(new_size)
    output = BytesIO()
    image.save(output, format='JPEG', quality=88, optimize=True)
    return output.getvalue()


def upload_image(sb: Client, bucket: str, path: str, content: bytes) -> str:
    sb.storage.from_(bucket).upload(path, content, {'content-type': 'image/jpeg', 'upsert': 'false'})
    public_url = sb.storage.from_(bucket).get_public_url(path)
    return public_url


def upsert_pin(sb: Client, pin: Dict):
    return sb.table('pins').upsert(pin, on_conflict='telegram_post_id,image_storage_path').execute()
