import json
from typing import Any, Dict

from openai import OpenAI

SYSTEM_PROMPT = '''
Ты извлекаешь структуру карточки бренда из текста Telegram-поста.
Верни строго JSON по схеме:
{
  "brand_name": "string",
  "tags": ["string"],
  "short_title": "string",
  "confidence": 0.0
}
Правила:
- tags: 3..10, lower-case, понятные человеку
- short_title: 40..80 символов
- confidence: число [0,1]
- никаких комментариев, markdown, лишних полей
'''.strip()


def extract_with_llm(client: OpenAI, model: str, text: str) -> Dict[str, Any]:
    response = client.responses.create(
        model=model,
        input=[
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': text[:8000]},
        ],
        response_format={
            'type': 'json_schema',
            'json_schema': {
                'name': 'pin_extraction',
                'schema': {
                    'type': 'object',
                    'additionalProperties': False,
                    'required': ['brand_name', 'tags', 'short_title', 'confidence'],
                    'properties': {
                        'brand_name': {'type': 'string'},
                        'tags': {'type': 'array', 'items': {'type': 'string'}},
                        'short_title': {'type': 'string'},
                        'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                    },
                },
            },
        },
    )
    payload = response.output_text
    data = json.loads(payload)
    data['tags'] = [str(t).strip().lower() for t in data.get('tags', []) if str(t).strip()]
    return data
