import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPinById } from '@/lib/data';

export default async function PinPage({ params }: { params: { id: string } }) {
  const pin = await getPinById(params.id).catch(() => null);
  if (!pin || pin.status !== 'published') return notFound();

  return (
    <article className="mx-auto max-w-3xl rounded-xl border bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pin.image_url} alt={pin.short_title ?? pin.brands?.name ?? 'pin'} className="mb-4 w-full rounded-lg" />
      <h1 className="mb-2 text-2xl font-semibold">{pin.brands?.name ?? 'Бренд не определен'}</h1>
      {pin.short_title ? <p className="mb-2 text-lg">{pin.short_title}</p> : null}
      <p className="whitespace-pre-wrap text-sm text-zinc-700">{pin.description || pin.telegram_posts?.text || 'Без описания'}</p>

      {pin.telegram_posts?.links?.length ? (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">Ссылки</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {pin.telegram_posts.links.map((link: string) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link href={pin.telegram_posts?.post_url || '#'} className="mt-6 inline-block text-sm text-zinc-600 underline" target="_blank">
        Источник: Telegram
      </Link>
    </article>
  );
}
