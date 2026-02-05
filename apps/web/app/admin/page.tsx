import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { updatePin } from '@/app/admin/actions';

export default async function AdminPinsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  let query = sb
    .from('pins')
    .select('id,image_url,short_title,description,tags,status,brand_id,brands(name)')
    .order('posted_at', { ascending: false })
    .limit(100);

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.q) query = query.textSearch('search_document', searchParams.q, { type: 'websearch' });

  const { data: pins } = await query;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Админка: Pins</h1>
        <Link href="/admin/brands" className="text-sm text-blue-600 underline">
          Бренды и merge
        </Link>
      </div>
      <div className="space-y-4">
        {(pins || []).map((pin) => (
          <form key={pin.id} action={updatePin} className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-6">
            <input type="hidden" name="id" value={pin.id} />
            <input type="hidden" name="brand_id" value={pin.brand_id ?? ''} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pin.image_url} alt="pin" className="h-28 w-full rounded object-cover" />
            <input
              name="brand_name"
              defaultValue={pin.brands?.name ?? ''}
              className="rounded border px-2 py-1 text-sm"
              placeholder="Бренд"
            />
            <input name="short_title" defaultValue={pin.short_title ?? ''} className="rounded border px-2 py-1 text-sm" placeholder="Короткий заголовок" />
            <input name="tags" defaultValue={(pin.tags || []).join(', ')} className="rounded border px-2 py-1 text-sm" placeholder="tags через запятую" />
            <select name="status" defaultValue={pin.status} className="rounded border px-2 py-1 text-sm">
              <option value="published">published</option>
              <option value="hidden">hidden</option>
              <option value="pending_review">pending_review</option>
              <option value="pending_low_confidence">pending_low_confidence</option>
            </select>
            <textarea
              name="description"
              defaultValue={pin.description ?? ''}
              className="rounded border px-2 py-1 text-sm md:col-span-4"
              rows={2}
              placeholder="Описание"
            />
            <button className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Сохранить</button>
          </form>
        ))}
      </div>
    </div>
  );
}
