import { getSupabaseAdminClient } from '@/lib/supabase';
import { normalizeTag } from '@/lib/utils';
import type { PinWithBrand } from '@/lib/types';

interface ListPinsParams {
  tag?: string;
  query?: string;
  status?: string;
  limit?: number;
}

export async function listPublishedPins(params: ListPinsParams = {}) {
  const sb = getSupabaseAdminClient();
  let query = sb
    .from('pins')
    .select(
      `id,image_url,short_title,description,tags,status,posted_at,llm_confidence,brand_id,
       brands(id,name,slug,is_hidden),telegram_posts(post_url,links)`
    )
    .eq('status', 'published')
    .order('posted_at', { ascending: false })
    .limit(params.limit ?? 120);

  if (params.tag) query = query.contains('tags', [normalizeTag(params.tag)]);
  if (params.query) query = query.textSearch('search_document', params.query, { type: 'websearch' });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PinWithBrand[];
}

export async function getPinById(id: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('pins')
    .select(
      `id,image_url,short_title,description,tags,status,posted_at,llm_confidence,brand_id,
       brands(id,name,slug,is_hidden),telegram_posts(post_url,links,text)`
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function listTags() {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('pins').select('tags').eq('status', 'published').limit(1000);
  if (error) throw error;
  const tags = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'ru'));
}

export async function getBrandBySlug(slug: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('brands').select('*').eq('slug', slug).single();
  if (error) return null;
  return data;
}

export async function listBrandPins(brandId: string) {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('pins')
    .select(
      `id,image_url,short_title,description,tags,status,posted_at,llm_confidence,brand_id,
       brands(id,name,slug,is_hidden),telegram_posts(post_url,links)`
    )
    .eq('status', 'published')
    .eq('brand_id', brandId)
    .order('posted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PinWithBrand[];
}
