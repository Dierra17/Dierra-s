import { notFound } from 'next/navigation';
import { getBrandBySlug, listBrandPins } from '@/lib/data';
import { PinCard } from '@/components/PinCard';

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = await getBrandBySlug(params.slug);
  if (!brand || brand.is_hidden) return notFound();

  const pins = await listBrandPins(brand.id);
  if (pins.length < 10) return notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{brand.name}</h1>
      <p className="mb-6 text-sm text-zinc-500">Карточек: {pins.length}</p>
      <section className="masonry">
        {pins.map((pin) => (
          <PinCard key={pin.id} pin={pin} />
        ))}
      </section>
    </div>
  );
}
