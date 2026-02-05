import { requireAdmin } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { hideBrand, mergeBrands } from '@/app/admin/actions';

export default async function AdminBrandsPage() {
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  const { data: brands } = await sb
    .from('brands')
    .select('id,name,slug,is_hidden,pins(count)')
    .order('name', { ascending: true })
    .limit(500);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Админка: Brands</h1>
      <form action={mergeBrands} className="mb-6 grid gap-2 rounded-xl border bg-white p-4 md:grid-cols-3">
        <select name="source_brand_id" required className="rounded border px-2 py-1 text-sm">
          <option value="">Источник (будет скрыт)</option>
          {(brands || []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select name="target_brand_id" required className="rounded border px-2 py-1 text-sm">
          <option value="">Целевой бренд</option>
          {(brands || []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Merge</button>
      </form>

      <div className="space-y-2">
        {(brands || []).map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded border bg-white px-3 py-2">
            <div>
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-zinc-500">/{b.slug} · pins: {b.pins?.[0]?.count ?? 0}</p>
            </div>
            <form action={hideBrand}>
              <input type="hidden" name="id" value={b.id} />
              <button className="rounded border px-3 py-1 text-sm">Скрыть</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
