'use server';

import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) return;
  const sb = getSupabaseAdminClient();
  await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/admin`
    }
  });
}

export async function updatePin(formData: FormData) {
  const id = String(formData.get('id'));
  const brandName = String(formData.get('brand_name') || '').trim();
  const shortTitle = String(formData.get('short_title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const status = String(formData.get('status') || 'pending_review');
  const tagsRaw = String(formData.get('tags') || '');
  const tags = tagsRaw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);

  const sb = getSupabaseAdminClient();
  let brandId = String(formData.get('brand_id') || '');
  if (brandName) {
    const normalized = brandName.toLowerCase().replace(/["'«»]/g, '').replace(/\s+/g, ' ').trim();
    const { data: existing } = await sb.from('brands').select('id').eq('name_normalized', normalized).maybeSingle();
    if (existing?.id) {
      brandId = existing.id;
    } else {
      const slug = slugify(brandName, { lower: true, strict: true, trim: true });
      const { data: created, error } = await sb
        .from('brands')
        .insert({ name: brandName, name_normalized: normalized, slug })
        .select('id')
        .single();
      if (!error && created) brandId = created.id;
    }
  }

  await sb
    .from('pins')
    .update({ brand_id: brandId || null, short_title: shortTitle || null, description: description || null, tags, status })
    .eq('id', id);

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function mergeBrands(formData: FormData) {
  const sourceId = String(formData.get('source_brand_id'));
  const targetId = String(formData.get('target_brand_id'));
  const sb = getSupabaseAdminClient();
  await sb.rpc('merge_brands', { source_id: sourceId, target_id: targetId });
  revalidatePath('/admin/brands');
  revalidatePath('/');
}

export async function hideBrand(formData: FormData) {
  const id = String(formData.get('id'));
  const sb = getSupabaseAdminClient();
  await sb.from('brands').update({ is_hidden: true }).eq('id', id);
  revalidatePath('/admin/brands');
}
