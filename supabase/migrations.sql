create extension if not exists pgcrypto;
create extension if not exists unaccent;

create type pin_status as enum ('published', 'hidden', 'pending_low_confidence', 'pending_review');

create table if not exists telegram_posts (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  message_id bigint not null,
  post_url text not null,
  text text,
  hashtags text[] not null default '{}',
  links text[] not null default '{}',
  posted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel, message_id)
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text not null unique,
  slug text not null unique,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pins (
  id uuid primary key default gen_random_uuid(),
  telegram_post_id uuid not null references telegram_posts(id) on delete cascade,
  brand_id uuid references brands(id) on delete set null,
  image_url text not null,
  image_storage_path text not null,
  short_title text,
  description text,
  tags text[] not null default '{}',
  status pin_status not null default 'pending_review',
  llm_confidence real,
  posted_at timestamptz not null,
  search_document tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(telegram_post_id, image_storage_path)
);

create table if not exists ingest_state (
  id uuid primary key default gen_random_uuid(),
  channel text not null unique,
  last_message_id bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_pins_status_posted_at on pins(status, posted_at desc);
create index if not exists idx_pins_tags on pins using gin(tags);
create index if not exists idx_pins_search_document on pins using gin(search_document);
create index if not exists idx_brands_name_normalized on brands(name_normalized);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_telegram_posts_updated
before update on telegram_posts
for each row execute function set_updated_at();

create trigger trg_brands_updated
before update on brands
for each row execute function set_updated_at();

create trigger trg_pins_updated
before update on pins
for each row execute function set_updated_at();

create or replace function refresh_pin_search_document(p_id uuid)
returns void as $$
begin
  update pins p
  set search_document =
    setweight(to_tsvector('russian', unaccent(coalesce((select b.name from brands b where b.id = p.brand_id), ''))), 'A') ||
    setweight(to_tsvector('russian', unaccent(coalesce(p.short_title, ''))), 'B') ||
    setweight(to_tsvector('russian', unaccent(coalesce(p.description, ''))), 'C')
  where p.id = p_id;
end;
$$ language plpgsql;

create or replace function trg_refresh_pin_search_document()
returns trigger as $$
begin
  perform refresh_pin_search_document(new.id);
  return new;
end;
$$ language plpgsql;

create trigger trg_pins_search_document
after insert or update of brand_id, short_title, description on pins
for each row execute function trg_refresh_pin_search_document();

create or replace function trg_refresh_brand_search_documents()
returns trigger as $$
begin
  update pins p
  set search_document =
    setweight(to_tsvector('russian', unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('russian', unaccent(coalesce(p.short_title, ''))), 'B') ||
    setweight(to_tsvector('russian', unaccent(coalesce(p.description, ''))), 'C')
  where p.brand_id = new.id;
  return new;
end;
$$ language plpgsql;

create trigger trg_brands_refresh_pins_search
after update of name on brands
for each row execute function trg_refresh_brand_search_documents();

create or replace function merge_brands(source_id uuid, target_id uuid)
returns void as $$
begin
  if source_id = target_id then
    raise exception 'source and target brand ids must differ';
  end if;

  update pins set brand_id = target_id where brand_id = source_id;
  update brands set is_hidden = true where id = source_id;
end;
$$ language plpgsql security definer;
