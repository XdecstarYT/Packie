-- Packie core schema: tables, helpers, RLS.

create type public.app_role as enum ('player', 'owner');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.game_settings (
  id int primary key default 1 check (id = 1),
  starting_coins int not null default 500 check (starting_coins >= 0),
  starting_gems int not null default 10 check (starting_gems >= 0),
  daily_reward_coins int not null default 150 check (daily_reward_coins >= 0),
  daily_reward_gems int not null default 1 check (daily_reward_gems >= 0),
  market_fee_pct numeric(5, 2) not null default 5 check (market_fee_pct between 0 and 50),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_url text,
  bio text check (char_length(bio) <= 160),
  role public.app_role not null default 'player',
  coins int not null default 0 check (coins >= 0),
  gems int not null default 0 check (gems >= 0),
  xp int not null default 0 check (xp >= 0),
  is_banned boolean not null default false,
  last_daily_claim timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  theme_color text not null default '#8b5cf6',
  banner_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons (id) on delete set null,
  name text not null,
  code text not null unique,
  description text,
  icon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rarities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  color text not null default '#94a3b8',
  glow text not null default 'none' check (glow in ('none', 'soft', 'strong', 'prismatic')),
  points int not null default 1 check (points >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.sets (id) on delete set null,
  name text not null,
  number_in_set int,
  flavor_text text,
  art_url text,
  rarity_id uuid not null references public.rarities (id) on delete restrict,
  element text not null default 'fire' check (element in ('fire', 'water', 'earth', 'air', 'shadow', 'light')),
  hp int not null default 50 check (hp >= 0),
  attack int not null default 10 check (attack >= 0),
  defense int not null default 10 check (defense >= 0),
  abilities jsonb not null default '[]'::jsonb check (jsonb_typeof(abilities) = 'array'),
  is_limited_edition boolean not null default false,
  max_print_run int check (max_print_run > 0),
  printed_count int not null default 0 check (printed_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint limited_needs_print_run check (not is_limited_edition or max_print_run is not null)
);
create index cards_set_id_idx on public.cards (set_id);
create index cards_rarity_id_idx on public.cards (rarity_id);

create table public.card_instances (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  serial_number int,
  foil boolean not null default false,
  acquired_from text not null default 'pack' check (acquired_from in ('pack', 'trade', 'reward', 'market', 'admin')),
  acquired_at timestamptz not null default now(),
  unique (card_id, serial_number)
);
create index card_instances_owner_idx on public.card_instances (owner_id);
create index card_instances_card_idx on public.card_instances (card_id);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  art_url text,
  theme_color text not null default '#8b5cf6',
  season_id uuid references public.seasons (id) on delete set null,
  price_coins int check (price_coins >= 0),
  price_gems int check (price_gems >= 0),
  slots jsonb not null default '[]'::jsonb check (jsonb_typeof(slots) = 'array'),
  is_limited_edition boolean not null default false,
  total_supply int check (total_supply > 0),
  sold_count int not null default 0 check (sold_count >= 0),
  per_user_limit int check (per_user_limit > 0),
  available_from timestamptz,
  available_until timestamptz,
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pack_has_price check (price_coins is not null or price_gems is not null),
  constraint limited_needs_supply check (not is_limited_edition or total_supply is not null)
);
create index packs_season_idx on public.packs (season_id);

create table public.pack_card_pool (
  pack_id uuid not null references public.packs (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  weight numeric not null default 1 check (weight > 0),
  primary key (pack_id, card_id)
);
create index pack_card_pool_card_idx on public.pack_card_pool (card_id);

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  banner_url text,
  theme_color text not null default '#f59e0b',
  season_id uuid references public.seasons (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drops_season_idx on public.drops (season_id);

create table public.drop_items (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  pack_id uuid references public.packs (id) on delete cascade,
  card_id uuid references public.cards (id) on delete cascade,
  special_price_coins int check (special_price_coins >= 0),
  created_at timestamptz not null default now(),
  constraint drop_item_target check ((pack_id is not null) <> (card_id is not null))
);
create index drop_items_drop_idx on public.drop_items (drop_id);
create index drop_items_pack_idx on public.drop_items (pack_id);
create index drop_items_card_idx on public.drop_items (card_id);

create table public.pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_id uuid references public.packs (id) on delete set null,
  price_coins int not null default 0,
  price_gems int not null default 0,
  results jsonb not null default '[]'::jsonb,
  opened_at timestamptz not null default now()
);
create index pack_openings_user_idx on public.pack_openings (user_id);
create index pack_openings_pack_idx on public.pack_openings (pack_id);
create index pack_openings_opened_idx on public.pack_openings (opened_at);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('purchase', 'reward', 'refund', 'trade', 'market', 'admin_grant', 'signup')),
  coins_delta int not null default 0,
  gems_delta int not null default 0,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id);

create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  card_instance_id uuid not null references public.card_instances (id) on delete cascade,
  price_coins int not null check (price_coins > 0),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create unique index market_one_active_listing on public.market_listings (card_instance_id) where status = 'active';
create index market_listings_seller_idx on public.market_listings (seller_id);
create index market_listings_buyer_idx on public.market_listings (buyer_id);
create index market_listings_status_idx on public.market_listings (status);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  offered_instance_ids uuid[] not null default '{}',
  requested_instance_ids uuid[] not null default '{}',
  offered_coins int not null default 0 check (offered_coins >= 0),
  message text check (char_length(message) <= 200),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index trades_from_idx on public.trades (from_user);
create index trades_to_idx on public.trades (to_user);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

insert into public.game_settings default values;

-- ---------------------------------------------------------------------------
-- Helpers & triggers
-- ---------------------------------------------------------------------------

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'seasons', 'sets', 'rarities', 'cards', 'packs', 'drops', 'game_settings'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Every owner change to catalog tables is recorded. Economy RPCs set
-- packie.skip_audit so counter bumps (sold_count, printed_count) stay quiet.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if coalesce(current_setting('packie.skip_audit', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'pack_id', v_old ->> 'pack_id'),
    jsonb_strip_nulls(jsonb_build_object('old', v_old, 'new', v_new))
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['seasons', 'sets', 'rarities', 'cards', 'packs', 'pack_card_pool', 'drops', 'drop_items', 'game_settings'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t, t);
  end loop;
end $$;

-- New auth user -> profile. The owner role is granted only to the owner email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.game_settings;
  v_base text;
  v_username text;
  v_try int := 0;
begin
  select * into v_settings from public.game_settings where id = 1;

  v_base := regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)), '[^A-Za-z0-9_]', '', 'g');
  if char_length(v_base) < 3 then
    v_base := 'player' || v_base;
  end if;
  v_base := left(v_base, 16);
  v_username := v_base;
  while exists (select 1 from public.profiles where lower(username) = lower(v_username)) loop
    v_try := v_try + 1;
    v_username := v_base || floor(random() * 9000 + 1000)::int;
    exit when v_try > 20;
  end loop;

  insert into public.profiles (id, username, role, coins, gems)
  values (
    new.id,
    v_username,
    case when lower(new.email) = 'decmar098@gmail.com' then 'owner'::public.app_role else 'player'::public.app_role end,
    coalesce(v_settings.starting_coins, 500),
    coalesce(v_settings.starting_gems, 10)
  );

  insert into public.transactions (user_id, type, coins_delta, gems_delta, note)
  values (new.id, 'signup', coalesce(v_settings.starting_coins, 500), coalesce(v_settings.starting_gems, 10), 'Welcome to Packie!');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.game_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.sets enable row level security;
alter table public.rarities enable row level security;
alter table public.cards enable row level security;
alter table public.card_instances enable row level security;
alter table public.packs enable row level security;
alter table public.pack_card_pool enable row level security;
alter table public.drops enable row level security;
alter table public.drop_items enable row level security;
alter table public.pack_openings enable row level security;
alter table public.transactions enable row level security;
alter table public.market_listings enable row level security;
alter table public.trades enable row level security;
alter table public.audit_log enable row level security;

-- Settings: readable by everyone, writable by the owner.
create policy "settings readable" on public.game_settings for select to anon, authenticated using (true);
create policy "settings owner update" on public.game_settings for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- Profiles: players see each other (usernames, levels, leaderboards);
-- only username / avatar / bio are self-editable (column grants below).
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, avatar_url, bio) on public.profiles to authenticated;

-- Catalog: public reads of live content, owner sees and edits everything.
create policy "seasons readable" on public.seasons for select to anon, authenticated using (status <> 'draft' or (select public.is_owner()));
create policy "sets readable" on public.sets for select to anon, authenticated using (true);
create policy "rarities readable" on public.rarities for select to anon, authenticated using (true);
create policy "cards readable" on public.cards for select to anon, authenticated using (is_active or (select public.is_owner()));
create policy "packs readable" on public.packs for select to anon, authenticated using (is_active or (select public.is_owner()));
create policy "pack pool readable" on public.pack_card_pool for select to anon, authenticated using (true);
create policy "drops readable" on public.drops for select to anon, authenticated using (is_published or (select public.is_owner()));
create policy "drop items readable" on public.drop_items for select to anon, authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array['seasons', 'sets', 'rarities', 'cards', 'packs', 'pack_card_pool', 'drops', 'drop_items'] loop
    execute format('create policy "%s owner insert" on public.%I for insert to authenticated with check ((select public.is_owner()))', t, t);
    execute format('create policy "%s owner update" on public.%I for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))', t, t);
    execute format('create policy "%s owner delete" on public.%I for delete to authenticated using ((select public.is_owner()))', t, t);
  end loop;
end $$;

-- Owned cards are visible to signed-in players (showcases, trades, market).
-- All writes go through security-definer RPCs.
create policy "instances readable" on public.card_instances for select to authenticated using (true);

create policy "openings own or owner" on public.pack_openings for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner()));
create policy "transactions own or owner" on public.transactions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner()));
create policy "listings readable" on public.market_listings for select to authenticated using (true);
create policy "trades participants" on public.trades for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()) or (select public.is_owner()));
create policy "audit owner only" on public.audit_log for select to authenticated using ((select public.is_owner()));

-- ---------------------------------------------------------------------------
-- Storage bucket for card / pack / banner art (owner uploads, public reads)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('packie-assets', 'packie-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "packie assets owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'packie-assets' and (select public.is_owner()));
create policy "packie assets owner update" on storage.objects for update to authenticated
  using (bucket_id = 'packie-assets' and (select public.is_owner()));
create policy "packie assets owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'packie-assets' and (select public.is_owner()));
