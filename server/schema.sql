create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists anime_catalog (
  id bigserial primary key,
  anilist_id integer unique,
  mal_id integer,
  title_romaji text,
  title_english text,
  title_native text,
  year integer,
  status text,
  episodes integer,
  cover_url text,
  color text,
  genres text[] not null default '{}',
  score integer,
  description text,
  updated_at timestamptz not null default now()
);

create index if not exists anime_catalog_search_idx
  on anime_catalog using gin (
    to_tsvector('simple', coalesce(title_romaji, '') || ' ' || coalesce(title_english, '') || ' ' || coalesce(title_native, ''))
  );

create table if not exists user_anime_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  anime_catalog_id bigint references anime_catalog(id) on delete set null,
  custom_title text,
  watch_status text not null default 'planned',
  ep_watched integer not null default 0,
  ep_total integer not null default 0,
  season_watched integer not null default 0,
  season_total integer not null default 0,
  rating integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_anime_library_user_idx on user_anime_library(user_id, updated_at desc);
