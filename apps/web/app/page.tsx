import { listPublishedPins, listTags } from '@/lib/data';
import { PinCard } from '@/components/PinCard';
import { SearchFilters } from '@/components/SearchFilters';

export default async function Home({ searchParams }: { searchParams: { q?: string; tag?: string } }) {
  const [pins, tags] = await Promise.all([
    listPublishedPins({ query: searchParams.q, tag: searchParams.tag }),
    listTags()
  ]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Каталог брендов из Telegram</h1>
      <SearchFilters tags={tags} />
      <section className="masonry">
        {pins.map((pin) => (
          <PinCard key={pin.id} pin={pin} />
        ))}
      </section>
    </div>
  );
}
