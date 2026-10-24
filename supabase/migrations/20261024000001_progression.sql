-- Round 1 progression: quick-sell duplicates, achievements, live rare-pull feed.

alter table public.transactions drop constraint transactions_type_check,
  add constraint transactions_type_check
  check (type in ('purchase', 'reward', 'refund', 'trade', 'market', 'admin_grant', 'signup', 'quick_sell', 'achievement', 'battle'));

-- ---------------------------------------------------------------------------
-- Quick-sell: every rarity has a coin value the owner controls.
-- ---------------------------------------------------------------------------
alter table public.rarities add column sell_value int not null default 5 check (sell_value >= 0);
update public.rarities set sell_value = case slug
  when 'common' then 5 when 'uncommon' then 15 when 'rare' then 50
  when 'epic' then 150 when 'legendary' then 500 when 'mythic' then 2500 else 5 end;

create or replace function public.quick_sell(p_instance_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_ids uuid[] := coalesce((select array_agg(distinct x) from unnest(p_instance_ids) x), '{}');
  v_total int;
  v_count int;
begin
  if cardinality(v_ids) = 0 then
    raise exception 'Pick at least one card.';
  end if;
  if cardinality(v_ids) > 200 then
    raise exception 'You can sell up to 200 cards at a time.';
  end if;

  perform 1 from public.card_instances where id = any (v_ids) order by id for update;

  if (select count(*) from public.card_instances where id = any (v_ids) and owner_id = v_uid) <> cardinality(v_ids) then
    raise exception 'You no longer own some of those cards.';
  end if;
  if exists (
    select 1 from public.card_instances ci join public.cards c on c.id = ci.card_id
    where ci.id = any (v_ids) and c.is_limited_edition
  ) then
    raise exception 'Limited editions can''t be quick-sold. List them on the market instead.';
  end if;
  if exists (select 1 from public.market_listings where card_instance_id = any (v_ids) and status = 'active') then
    raise exception 'Unlist those cards from the market first.';
  end if;
  if exists (
    select 1 from public.trades
    where status = 'pending' and (v_ids && offered_instance_ids or v_ids && requested_instance_ids)
  ) then
    raise exception 'Some of those cards are part of a pending trade.';
  end if;

  select coalesce(sum(r.sell_value * case when ci.foil then 3 else 1 end), 0), count(*)
  into v_total, v_count
  from public.card_instances ci
  join public.cards c on c.id = ci.card_id
  join public.rarities r on r.id = c.rarity_id
  where ci.id = any (v_ids);

  delete from public.card_instances where id = any (v_ids);
  update public.profiles set coins = coins + v_total where id = v_uid;
  insert into public.transactions (user_id, type, coins_delta, note)
  values (v_uid, 'quick_sell', v_total, 'Quick-sold ' || v_count || ' card' || case when v_count = 1 then '' else 's' end);

  return jsonb_build_object('coins', v_total, 'count', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- Achievements (owner-defined; progress computed server-side)
-- ---------------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  icon text not null default 'trophy',
  kind text not null check (kind in ('packs_opened', 'cards_owned', 'unique_cards', 'sets_completed', 'rarity_owned', 'foils_owned', 'trades_completed', 'market_sales', 'level', 'battles_won')),
  param text,
  target int not null default 1 check (target > 0),
  reward_coins int not null default 0 check (reward_coins >= 0),
  reward_gems int not null default 0 check (reward_gems >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index user_achievements_achievement_idx on public.user_achievements (achievement_id);

create trigger achievements_updated_at before update on public.achievements for each row execute function public.set_updated_at();
create trigger achievements_audit after insert or update or delete on public.achievements for each row execute function public.write_audit_log();

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
create policy "achievements readable" on public.achievements for select to anon, authenticated using (is_active or (select public.is_owner()));
create policy "achievements owner insert" on public.achievements for insert to authenticated with check ((select public.is_owner()));
create policy "achievements owner update" on public.achievements for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "achievements owner delete" on public.achievements for delete to authenticated using ((select public.is_owner()));
create policy "user achievements readable" on public.user_achievements for select to authenticated using (true);

-- Battles are created in a later migration; progress for that kind reads it if present.
create or replace function public._achievement_progress(p_uid uuid, p_kind text, p_param text)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v int := 0;
begin
  case p_kind
    when 'packs_opened' then
      select count(*) into v from public.pack_openings where user_id = p_uid;
    when 'cards_owned' then
      select count(*) into v from public.card_instances where owner_id = p_uid;
    when 'unique_cards' then
      select count(distinct card_id) into v from public.card_instances where owner_id = p_uid;
    when 'foils_owned' then
      select count(*) into v from public.card_instances where owner_id = p_uid and foil;
    when 'rarity_owned' then
      select count(*) into v from public.card_instances ci
        join public.cards c on c.id = ci.card_id join public.rarities r on r.id = c.rarity_id
        where ci.owner_id = p_uid and r.slug = p_param;
    when 'sets_completed' then
      select count(*) into v from public.sets s
        where exists (select 1 from public.cards c where c.set_id = s.id and c.is_active)
          and not exists (
            select 1 from public.cards c where c.set_id = s.id and c.is_active
              and not exists (select 1 from public.card_instances ci where ci.card_id = c.id and ci.owner_id = p_uid)
          );
    when 'trades_completed' then
      select count(*) into v from public.trades where status = 'accepted' and (from_user = p_uid or to_user = p_uid);
    when 'market_sales' then
      select count(*) into v from public.market_listings where status = 'sold' and seller_id = p_uid;
    when 'level' then
      select floor(sqrt(xp / 50.0))::int + 1 into v from public.profiles where id = p_uid;
    when 'battles_won' then
      if to_regclass('public.battles') is not null then
        execute 'select count(*) from public.battles where user_id = $1 and result = ''win''' into v using p_uid;
      end if;
    else
      v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;

create or replace function public.get_achievements()
returns table (
  id uuid, slug text, name text, description text, icon text, kind text, target int,
  reward_coins int, reward_gems int, progress int, claimed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.slug, a.name, a.description, a.icon, a.kind, a.target, a.reward_coins, a.reward_gems,
         least(public._achievement_progress((select auth.uid()), a.kind, a.param), a.target) as progress,
         ua.claimed_at
  from public.achievements a
  left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = (select auth.uid())
  where a.is_active and (select auth.uid()) is not null
  order by a.sort_order, a.created_at;
$$;

create or replace function public.claim_achievement(p_achievement_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_a public.achievements;
begin
  select * into v_a from public.achievements where id = p_achievement_id and is_active;
  if not found then raise exception 'Achievement not found.'; end if;
  if exists (select 1 from public.user_achievements where user_id = v_uid and achievement_id = p_achievement_id) then
    raise exception 'Already claimed.';
  end if;
  if public._achievement_progress(v_uid, v_a.kind, v_a.param) < v_a.target then
    raise exception 'Not completed yet.';
  end if;
  insert into public.user_achievements (user_id, achievement_id) values (v_uid, p_achievement_id);
  update public.profiles set coins = coins + v_a.reward_coins, gems = gems + v_a.reward_gems, xp = xp + 25 where id = v_uid;
  insert into public.transactions (user_id, type, coins_delta, gems_delta, reference_id, note)
  values (v_uid, 'achievement', v_a.reward_coins, v_a.reward_gems, p_achievement_id, 'Achievement: ' || v_a.name);
  return jsonb_build_object('coins', v_a.reward_coins, 'gems', v_a.reward_gems);
end;
$$;

select set_config('packie.skip_audit', 'on', true);
insert into public.achievements (slug, name, description, icon, kind, param, target, reward_coins, reward_gems, sort_order) values
  ('first-rip',      'First Rip',         'Open your very first pack.',               'package',  'packs_opened',     null,        1,   100, 0, 1),
  ('pack-addict',    'Pack Addict',       'Open 25 packs.',                           'flame',    'packs_opened',     null,        25,  500, 2, 2),
  ('binder-builder', 'Binder Builder',    'Own 50 cards.',                            'layers',   'cards_owned',      null,        50,  300, 1, 3),
  ('curator',        'Curator',           'Collect 20 different cards.',              'sparkles', 'unique_cards',     null,        20,  400, 2, 4),
  ('shiny',          'Ooh, Shiny',        'Pull 3 foil cards.',                       'star',     'foils_owned',      null,        3,   250, 1, 5),
  ('epic-moment',    'Epic Moment',       'Own an Epic card.',                        'gem',      'rarity_owned',     'epic',      1,   200, 1, 6),
  ('legend-hunter',  'Legend Hunter',     'Own a Legendary card.',                    'crown',    'rarity_owned',     'legendary', 1,   600, 3, 7),
  ('mythbuster',     'Mythbuster',        'Own a Mythic card.',                       'sun',      'rarity_owned',     'mythic',    1,   2000, 10, 8),
  ('completionist',  'Completionist',     'Complete a full set.',                     'trophy',   'sets_completed',   null,        1,   5000, 25, 9),
  ('dealmaker',      'Dealmaker',         'Complete a trade with another collector.', 'handshake','trades_completed', null,        1,   200, 1, 10),
  ('merchant',       'Merchant',          'Sell a card on the market.',               'store',    'market_sales',     null,        1,   150, 0, 11),
  ('rising-star',    'Rising Star',       'Reach level 5.',                           'rocket',   'level',            null,        5,   500, 3, 12);

-- ---------------------------------------------------------------------------
-- Live feed of rare pulls (Epic and above), public so the landing page can show it.
-- ---------------------------------------------------------------------------
create or replace function public.get_recent_pulls(p_limit int default 20)
returns table (
  instance_id uuid, username text, card_id uuid, card_name text, rarity_name text, rarity_color text,
  rarity_order int, serial_number int, foil boolean, pulled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select ci.id, p.username, c.id, c.name, r.name, r.color, r.sort_order, ci.serial_number, ci.foil, ci.acquired_at
  from public.card_instances ci
  join public.cards c on c.id = ci.card_id
  join public.rarities r on r.id = c.rarity_id
  join public.profiles p on p.id = ci.owner_id
  where ci.acquired_from = 'pack' and r.sort_order >= 4 and not p.is_banned
  order by ci.acquired_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public._achievement_progress(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.quick_sell(uuid[]) from public, anon;
grant execute on function public.quick_sell(uuid[]) to authenticated;
revoke execute on function public.get_achievements() from public, anon;
grant execute on function public.get_achievements() to authenticated;
revoke execute on function public.claim_achievement(uuid) from public, anon;
grant execute on function public.claim_achievement(uuid) to authenticated;
grant execute on function public.get_recent_pulls(int) to anon, authenticated;
