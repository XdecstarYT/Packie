-- Packie economy: every coin / card movement happens here, in one transaction,
-- with server-side randomness. Players have no direct write access to balances
-- or card ownership.

-- ---------------------------------------------------------------------------
-- Internal guard: signed-in, not banned. Returns the caller's id.
-- ---------------------------------------------------------------------------
create or replace function public._require_player()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'You need to be signed in.' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and is_banned) then
    raise exception 'This account is suspended.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Buy & open a pack
-- ---------------------------------------------------------------------------
create or replace function public.buy_and_open_pack(p_pack_id uuid, p_currency text default 'coins')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_pack public.packs;
  v_profile public.profiles;
  v_special int;
  v_price_coins int := 0;
  v_price_gems int := 0;
  v_opened_by_user int;
  v_use_pool boolean;
  v_slot jsonb;
  v_rarity text;
  v_card_id uuid;
  v_card public.cards;
  v_serial int;
  v_foil boolean;
  v_instance_id uuid;
  v_attempt int;
  v_results jsonb := '[]'::jsonb;
  v_opening_id uuid;
begin
  perform set_config('packie.skip_audit', 'on', true);

  select * into v_pack from public.packs where id = p_pack_id for update;
  if not found or not v_pack.is_active then
    raise exception 'This pack is not available.';
  end if;
  if v_pack.available_from is not null and v_pack.available_from > now() then
    raise exception 'This pack is not on sale yet.';
  end if;
  if v_pack.available_until is not null and v_pack.available_until <= now() then
    raise exception 'This pack is no longer on sale.';
  end if;
  if v_pack.total_supply is not null and v_pack.sold_count >= v_pack.total_supply then
    raise exception 'Sold out!';
  end if;
  if jsonb_array_length(v_pack.slots) = 0 then
    raise exception 'This pack has no card slots configured.';
  end if;

  if v_pack.per_user_limit is not null then
    select count(*) into v_opened_by_user from public.pack_openings where user_id = v_uid and pack_id = p_pack_id;
    if v_opened_by_user >= v_pack.per_user_limit then
      raise exception 'You have reached the limit of % for this pack.', v_pack.per_user_limit;
    end if;
  end if;

  -- Price (a live drop can discount the coin price).
  if p_currency = 'gems' then
    if v_pack.price_gems is null then
      raise exception 'This pack cannot be bought with gems.';
    end if;
    v_price_gems := v_pack.price_gems;
  else
    select min(di.special_price_coins) into v_special
    from public.drop_items di
    join public.drops d on d.id = di.drop_id
    where di.pack_id = p_pack_id
      and di.special_price_coins is not null
      and d.is_published
      and d.starts_at <= now()
      and (d.ends_at is null or d.ends_at > now());
    v_price_coins := coalesce(v_special, v_pack.price_coins);
    if v_price_coins is null then
      raise exception 'This pack cannot be bought with coins.';
    end if;
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.coins < v_price_coins then
    raise exception 'Not enough coins.';
  end if;
  if v_profile.gems < v_price_gems then
    raise exception 'Not enough gems.';
  end if;

  update public.profiles
  set coins = coins - v_price_coins,
      gems = gems - v_price_gems,
      xp = xp + 10 * jsonb_array_length(v_pack.slots)
  where id = v_uid;

  v_use_pool := exists (select 1 from public.pack_card_pool where pack_id = p_pack_id);

  for v_slot in select value from jsonb_array_elements(v_pack.slots) loop
    v_attempt := 0;
    loop
      v_attempt := v_attempt + 1;
      v_card_id := null;

      -- Weighted rarity among rarities that still have cards available.
      -- Exponential race: argmin(-ln(U)/w) picks each option with p = w / sum(w).
      with avail as (
        select c.id, r.slug, coalesce(pp.weight, 1) as w
        from public.cards c
        join public.rarities r on r.id = c.rarity_id
        left join public.sets s on s.id = c.set_id
        left join public.pack_card_pool pp on pp.pack_id = p_pack_id and pp.card_id = c.id
        where c.is_active
          and (c.max_print_run is null or c.printed_count < c.max_print_run)
          and case
                when v_use_pool then pp.card_id is not null
                when v_pack.season_id is not null then s.season_id = v_pack.season_id
                else true
              end
      ),
      rarity_pick as (
        select a.slug
        from (select distinct slug from avail) a
        where coalesce((v_slot -> 'weights' ->> a.slug)::numeric, 0) > 0
        order by -ln(1 - random()) / (v_slot -> 'weights' ->> a.slug)::numeric
        limit 1
      )
      select av.id into v_card_id
      from avail av
      where av.slug = coalesce((select slug from rarity_pick), av.slug)
      order by -ln(1 - random()) / av.w
      limit 1;

      if v_card_id is null then
        raise exception 'No cards are available for this pack right now.';
      end if;

      select * into v_card from public.cards where id = v_card_id for update;
      exit when v_card.max_print_run is null or v_card.printed_count < v_card.max_print_run;
      if v_attempt >= 5 then
        raise exception 'Could not complete the pack, please try again.';
      end if;
    end loop;

    update public.cards set printed_count = printed_count + 1 where id = v_card.id
    returning printed_count into v_serial;

    v_foil := random() < coalesce((v_slot ->> 'foil_chance')::numeric, 0);

    insert into public.card_instances (card_id, owner_id, serial_number, foil, acquired_from)
    values (v_card.id, v_uid, case when v_card.is_limited_edition then v_serial end, v_foil, 'pack')
    returning id into v_instance_id;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'instance_id', v_instance_id,
      'card_id', v_card.id,
      'serial_number', case when v_card.is_limited_edition then v_serial end,
      'foil', v_foil
    ));
  end loop;

  update public.packs set sold_count = sold_count + 1 where id = p_pack_id;

  insert into public.pack_openings (user_id, pack_id, price_coins, price_gems, results)
  values (v_uid, p_pack_id, v_price_coins, v_price_gems, v_results)
  returning id into v_opening_id;

  insert into public.transactions (user_id, type, coins_delta, gems_delta, reference_id, note)
  values (v_uid, 'purchase', -v_price_coins, -v_price_gems, v_opening_id, 'Opened ' || v_pack.name);

  return jsonb_build_object('opening_id', v_opening_id, 'cards', v_results);
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily reward (every 20 hours, so the same time each day always works)
-- ---------------------------------------------------------------------------
create or replace function public.claim_daily_reward()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_last timestamptz;
  v_settings public.game_settings;
begin
  select last_daily_claim into v_last from public.profiles where id = v_uid for update;
  if v_last is not null and v_last > now() - interval '20 hours' then
    raise exception 'Come back later! Next reward at %', to_char(v_last + interval '20 hours', 'HH24:MI "UTC"');
  end if;
  select * into v_settings from public.game_settings where id = 1;

  update public.profiles
  set coins = coins + v_settings.daily_reward_coins,
      gems = gems + v_settings.daily_reward_gems,
      xp = xp + 5,
      last_daily_claim = now()
  where id = v_uid;

  insert into public.transactions (user_id, type, coins_delta, gems_delta, note)
  values (v_uid, 'reward', v_settings.daily_reward_coins, v_settings.daily_reward_gems, 'Daily reward');

  return jsonb_build_object(
    'coins', v_settings.daily_reward_coins,
    'gems', v_settings.daily_reward_gems,
    'next_claim_at', now() + interval '20 hours'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------------
create or replace function public.list_on_market(p_instance_id uuid, p_price int)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_id uuid;
begin
  if p_price is null or p_price < 1 or p_price > 10000000 then
    raise exception 'Price must be between 1 and 10,000,000 coins.';
  end if;
  if not exists (select 1 from public.card_instances where id = p_instance_id and owner_id = v_uid) then
    raise exception 'You do not own this card.';
  end if;
  if exists (select 1 from public.market_listings where card_instance_id = p_instance_id and status = 'active') then
    raise exception 'This card is already listed.';
  end if;
  if exists (
    select 1 from public.trades
    where status = 'pending' and from_user = v_uid and p_instance_id = any (offered_instance_ids)
  ) then
    raise exception 'This card is part of a pending trade offer.';
  end if;

  insert into public.market_listings (seller_id, card_instance_id, price_coins)
  values (v_uid, p_instance_id, p_price)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_listing(p_listing_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
begin
  update public.market_listings set status = 'cancelled'
  where id = p_listing_id and status = 'active' and (seller_id = v_uid or public.is_owner());
  if not found then
    raise exception 'Listing not found.';
  end if;
end;
$$;

create or replace function public.buy_listing(p_listing_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_listing public.market_listings;
  v_fee int;
  v_fee_pct numeric;
begin
  select * into v_listing from public.market_listings where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then
    raise exception 'This listing is no longer available.';
  end if;
  if v_listing.seller_id = v_uid then
    raise exception 'You cannot buy your own listing.';
  end if;
  if not exists (
    select 1 from public.card_instances where id = v_listing.card_instance_id and owner_id = v_listing.seller_id
  ) then
    update public.market_listings set status = 'cancelled' where id = p_listing_id;
    raise exception 'This listing is no longer available.';
  end if;

  perform 1 from public.profiles where id in (v_uid, v_listing.seller_id) order by id for update;
  if (select coins from public.profiles where id = v_uid) < v_listing.price_coins then
    raise exception 'Not enough coins.';
  end if;

  select market_fee_pct into v_fee_pct from public.game_settings where id = 1;
  v_fee := floor(v_listing.price_coins * v_fee_pct / 100);

  update public.profiles set coins = coins - v_listing.price_coins where id = v_uid;
  update public.profiles set coins = coins + v_listing.price_coins - v_fee where id = v_listing.seller_id;
  update public.card_instances set owner_id = v_uid, acquired_from = 'market', acquired_at = now()
  where id = v_listing.card_instance_id;
  update public.market_listings set status = 'sold', buyer_id = v_uid, sold_at = now() where id = p_listing_id;

  insert into public.transactions (user_id, type, coins_delta, reference_id, note) values
    (v_uid, 'market', -v_listing.price_coins, p_listing_id, 'Bought a card on the market'),
    (v_listing.seller_id, 'market', v_listing.price_coins - v_fee, p_listing_id, 'Sold a card on the market (fee ' || v_fee || ')');

  return v_listing.card_instance_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trades
-- ---------------------------------------------------------------------------
create or replace function public.create_trade(
  p_to_user uuid,
  p_offered uuid[],
  p_requested uuid[],
  p_offered_coins int default 0,
  p_message text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_offered uuid[] := coalesce((select array_agg(distinct x) from unnest(p_offered) x), '{}');
  v_requested uuid[] := coalesce((select array_agg(distinct x) from unnest(p_requested) x), '{}');
  v_id uuid;
begin
  if p_to_user = v_uid then
    raise exception 'You cannot trade with yourself.';
  end if;
  if not exists (select 1 from public.profiles where id = p_to_user and not is_banned) then
    raise exception 'Player not found.';
  end if;
  if cardinality(v_offered) = 0 and cardinality(v_requested) = 0 then
    raise exception 'A trade needs at least one card.';
  end if;
  if cardinality(v_offered) > 10 or cardinality(v_requested) > 10 then
    raise exception 'Trades are limited to 10 cards per side.';
  end if;
  if coalesce(p_offered_coins, 0) < 0 then
    raise exception 'Coins offered cannot be negative.';
  end if;
  if (select count(*) from public.card_instances where id = any (v_offered) and owner_id = v_uid) <> cardinality(v_offered) then
    raise exception 'You no longer own some of the cards you offered.';
  end if;
  if (select count(*) from public.card_instances where id = any (v_requested) and owner_id = p_to_user) <> cardinality(v_requested) then
    raise exception 'They no longer own some of the cards you asked for.';
  end if;
  if exists (select 1 from public.market_listings where card_instance_id = any (v_offered) and status = 'active') then
    raise exception 'Unlist your cards from the market before offering them.';
  end if;

  insert into public.trades (from_user, to_user, offered_instance_ids, requested_instance_ids, offered_coins, message)
  values (v_uid, p_to_user, v_offered, v_requested, coalesce(p_offered_coins, 0), nullif(trim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.respond_trade(p_trade_id uuid, p_action text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_player();
  v_trade public.trades;
begin
  select * into v_trade from public.trades where id = p_trade_id for update;
  if not found or v_trade.status <> 'pending' then
    raise exception 'This trade is no longer pending.';
  end if;

  if p_action = 'cancel' then
    if v_trade.from_user <> v_uid then raise exception 'Only the sender can cancel.'; end if;
    update public.trades set status = 'cancelled', resolved_at = now() where id = p_trade_id;
    return 'cancelled';
  end if;

  if v_trade.to_user <> v_uid then
    raise exception 'Only the recipient can respond.';
  end if;

  if p_action = 'decline' then
    update public.trades set status = 'declined', resolved_at = now() where id = p_trade_id;
    return 'declined';
  end if;

  if p_action <> 'accept' then
    raise exception 'Unknown action.';
  end if;

  perform 1 from public.profiles where id in (v_trade.from_user, v_trade.to_user) order by id for update;
  perform 1 from public.card_instances
  where id = any (v_trade.offered_instance_ids || v_trade.requested_instance_ids) order by id for update;

  if (select count(*) from public.card_instances where id = any (v_trade.offered_instance_ids) and owner_id = v_trade.from_user)
       <> cardinality(v_trade.offered_instance_ids)
     or (select count(*) from public.card_instances where id = any (v_trade.requested_instance_ids) and owner_id = v_trade.to_user)
       <> cardinality(v_trade.requested_instance_ids) then
    update public.trades set status = 'cancelled', resolved_at = now() where id = p_trade_id;
    return 'cancelled';
  end if;
  if v_trade.offered_coins > 0 and (select coins from public.profiles where id = v_trade.from_user) < v_trade.offered_coins then
    raise exception 'The sender no longer has enough coins for this trade.';
  end if;

  update public.market_listings set status = 'cancelled'
  where status = 'active' and card_instance_id = any (v_trade.offered_instance_ids || v_trade.requested_instance_ids);

  update public.card_instances set owner_id = v_trade.to_user, acquired_from = 'trade', acquired_at = now()
  where id = any (v_trade.offered_instance_ids);
  update public.card_instances set owner_id = v_trade.from_user, acquired_from = 'trade', acquired_at = now()
  where id = any (v_trade.requested_instance_ids);

  if v_trade.offered_coins > 0 then
    update public.profiles set coins = coins - v_trade.offered_coins where id = v_trade.from_user;
    update public.profiles set coins = coins + v_trade.offered_coins where id = v_trade.to_user;
    insert into public.transactions (user_id, type, coins_delta, reference_id, note) values
      (v_trade.from_user, 'trade', -v_trade.offered_coins, p_trade_id, 'Coins sent in trade'),
      (v_trade.to_user, 'trade', v_trade.offered_coins, p_trade_id, 'Coins received in trade');
  end if;

  update public.profiles set xp = xp + 15 where id in (v_trade.from_user, v_trade.to_user);
  update public.trades set status = 'accepted', resolved_at = now() where id = p_trade_id;
  return 'accepted';
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboard
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  xp int,
  cards_owned bigint,
  unique_cards bigint,
  collection_score bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username, p.avatar_url, p.xp,
         count(ci.id) as cards_owned,
         count(distinct ci.card_id) as unique_cards,
         coalesce(sum(r.points * case when ci.foil then 2 else 1 end), 0)::bigint as collection_score
  from public.profiles p
  left join public.card_instances ci on ci.owner_id = p.id
  left join public.cards c on c.id = ci.card_id
  left join public.rarities r on r.id = c.rarity_id
  where not p.is_banned
  group by p.id
  order by collection_score desc, p.xp desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- ---------------------------------------------------------------------------
-- Owner tools
-- ---------------------------------------------------------------------------
create or replace function public.owner_grant_currency(p_user_id uuid, p_coins int, p_gems int, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Owner only.' using errcode = '42501';
  end if;
  update public.profiles
  set coins = greatest(0, coins + coalesce(p_coins, 0)),
      gems = greatest(0, gems + coalesce(p_gems, 0))
  where id = p_user_id;
  if not found then
    raise exception 'Player not found.';
  end if;
  insert into public.transactions (user_id, type, coins_delta, gems_delta, note)
  values (p_user_id, 'admin_grant', coalesce(p_coins, 0), coalesce(p_gems, 0), coalesce(nullif(trim(p_note), ''), 'Granted by the owner'));
  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values ((select auth.uid()), 'grant', 'profiles', p_user_id::text, jsonb_build_object('coins', p_coins, 'gems', p_gems, 'note', p_note));
end;
$$;

create or replace function public.owner_set_ban(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Owner only.' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot ban yourself.';
  end if;
  update public.profiles set is_banned = p_banned where id = p_user_id;
  update public.market_listings set status = 'cancelled' where seller_id = p_user_id and status = 'active' and p_banned;
  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values ((select auth.uid()), case when p_banned then 'ban' else 'unban' end, 'profiles', p_user_id::text, null);
end;
$$;

create or replace function public.owner_grant_card(p_user_id uuid, p_card_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_card public.cards;
  v_serial int;
  v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Owner only.' using errcode = '42501';
  end if;
  perform set_config('packie.skip_audit', 'on', true);
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then raise exception 'Card not found.'; end if;
  if v_card.max_print_run is not null and v_card.printed_count >= v_card.max_print_run then
    raise exception 'This card is fully printed.';
  end if;
  update public.cards set printed_count = printed_count + 1 where id = p_card_id returning printed_count into v_serial;
  insert into public.card_instances (card_id, owner_id, serial_number, acquired_from)
  values (p_card_id, p_user_id, case when v_card.is_limited_edition then v_serial end, 'admin')
  returning id into v_id;
  perform set_config('packie.skip_audit', 'off', true);
  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values ((select auth.uid()), 'grant_card', 'profiles', p_user_id::text, jsonb_build_object('card_id', p_card_id, 'instance_id', v_id));
  return v_id;
end;
$$;

create or replace function public.get_owner_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_owner() then
    raise exception 'Owner only.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'new_players_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'packs_opened_today', (select count(*) from public.pack_openings where opened_at >= date_trunc('day', now())),
    'packs_opened_7d', (select count(*) from public.pack_openings where opened_at > now() - interval '7 days'),
    'packs_opened_total', (select count(*) from public.pack_openings),
    'coins_spent_7d', (select coalesce(sum(price_coins), 0) from public.pack_openings where opened_at > now() - interval '7 days'),
    'gems_spent_7d', (select coalesce(sum(price_gems), 0) from public.pack_openings where opened_at > now() - interval '7 days'),
    'cards_in_circulation', (select count(*) from public.card_instances),
    'active_listings', (select count(*) from public.market_listings where status = 'active'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'opened', coalesce(o.n, 0), 'coins', coalesce(o.c, 0)) order by d), '[]'::jsonb)
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      left join (
        select date_trunc('day', opened_at) as day, count(*) as n, sum(price_coins) as c
        from public.pack_openings
        where opened_at > now() - interval '15 days'
        group by 1
      ) o on o.day = d
    ),
    'top_packs', (
      select coalesce(jsonb_agg(t order by t.opened desc), '[]'::jsonb)
      from (
        select p.id, p.name, p.theme_color, count(po.id) as opened, coalesce(sum(po.price_coins), 0) as coins
        from public.packs p
        left join public.pack_openings po on po.pack_id = p.id
        group by p.id
        order by opened desc
        limit 5
      ) t
    ),
    'limited_cards', (
      select coalesce(jsonb_agg(t order by t.remaining), '[]'::jsonb)
      from (
        select c.id, c.name, c.printed_count, c.max_print_run, c.max_print_run - c.printed_count as remaining
        from public.cards c
        where c.is_limited_edition
      ) t
    )
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privileges: internal helpers are private; RPCs are for signed-in users.
-- ---------------------------------------------------------------------------
revoke execute on function public._require_player() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.buy_and_open_pack(uuid, text)',
    'public.claim_daily_reward()',
    'public.list_on_market(uuid, int)',
    'public.cancel_listing(uuid)',
    'public.buy_listing(uuid)',
    'public.create_trade(uuid, uuid[], uuid[], int, text)',
    'public.respond_trade(uuid, text)',
    'public.get_leaderboard(int)',
    'public.owner_grant_currency(uuid, int, int, text)',
    'public.owner_set_ban(uuid, boolean)',
    'public.owner_grant_card(uuid, uuid)',
    'public.get_owner_stats()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
