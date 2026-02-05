import Link from 'next/link';
import type { PinWithBrand } from '@/lib/types';

export function PinCard({ pin }: { pin: PinWithBrand }) {
  return (
    <article className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-white shadow-sm">
      <Link href={`/pin/${pin.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pin.image_url} alt={pin.short_title ?? pin.brands?.name ?? 'pin'} className="h-auto w-full object-cover" />
      </Link>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-medium">{pin.short_title || pin.brands?.name || 'Без названия'}</p>
        {pin.brands?.slug ? (
          <Link href={`/brand/${pin.brands.slug}`} className="text-xs text-zinc-500 hover:text-zinc-800">
            {pin.brands.name}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
