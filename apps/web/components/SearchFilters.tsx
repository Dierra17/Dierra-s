'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function SearchFilters({ tags }: { tags: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const selectedTag = params.get('tag') || '';
  const q = params.get('q') || '';

  const apply = (formData: FormData) => {
    const next = new URLSearchParams(params.toString());
    const nq = String(formData.get('q') || '');
    const ntag = String(formData.get('tag') || '');
    if (nq) next.set('q', nq); else next.delete('q');
    if (ntag) next.set('tag', ntag); else next.delete('tag');
    router.push(`/?${next.toString()}`);
  };

  return (
    <form action={apply} className="mb-6 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <input
        defaultValue={q}
        name="q"
        placeholder="Поиск по бренду и описанию"
        className="rounded-lg border px-3 py-2 text-sm"
      />
      <select name="tag" defaultValue={selectedTag} className="rounded-lg border px-3 py-2 text-sm">
        <option value="">Все теги</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
      <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">Применить</button>
    </form>
  );
}
