export type PinStatus = 'published' | 'hidden' | 'pending_low_confidence' | 'pending_review';

export interface PinWithBrand {
  id: string;
  image_url: string;
  short_title: string | null;
  description: string | null;
  tags: string[];
  status: PinStatus;
  posted_at: string;
  llm_confidence: number | null;
  brand_id: string;
  brands: { id: string; name: string; slug: string; is_hidden: boolean } | null;
  telegram_posts: { post_url: string; links: string[] } | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  is_hidden: boolean;
}
