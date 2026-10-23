# Packie — Master Build Prompt

> Paste this whole file into a new Claude Code session (or keep it in the repo and say "build Packie from PACKIE_MASTER_PROMPT.md").

---

## Role & goal

You are a senior full-stack engineer and game designer. Build **Packie**, a digital collectible card game web app in the spirit of Pokémon TCG / sports trading cards. Players earn or buy in-game coins, open packs with a satisfying reveal, collect cards (including numbered limited editions), complete sets, and trade. A single **owner** account runs the whole game from an Owner Dashboard: creating cards, packs, pricing, seasons, and drops.

Build it end to end, working and deployable — not a mockup. Work in small, committed steps, and run the app to check each feature before moving on.

---

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Framer Motion for pack-opening and card animations.
- **Backend:** **Supabase** — Auth (email + password), Postgres, Row Level Security, Storage (card art, pack art), Postgres RPC functions, and Edge Functions where needed.
- **Supabase project:** `packie`, ref `ievkiawudzjppnlfgouz`, region `ap-southeast-2`. It already exists, so use it instead of creating a new one.
- **Types:** generate Supabase TypeScript types and use them everywhere.
- **Config:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (git-ignored), plus a `.env.example`.
- **Migrations:** every schema change goes in `supabase/migrations/*.sql`.

---

## Owner account & access control

- The owner is the Supabase Auth user with email **`decmar098@gmail.com`**.
- **Never hard-code the owner's password in code, migrations, seeds, or this repo.** The owner signs up once through the normal sign-up screen (or is created in the Supabase dashboard) and sets their own password there.
- A `profiles` table has a `role` column (`'player' | 'owner'`). An `on auth.users insert` trigger creates the profile and sets `role = 'owner'` only when the email is `decmar098@gmail.com`; everyone else gets `'player'`.
- Add an `is_owner()` SQL helper (`security definer`, stable) that RLS policies and RPCs use.
- **Security comes from the server, not the UI:** every owner-only write is enforced by RLS / `is_owner()` checks in Postgres. Hiding routes on the frontend is only for user experience.
- After login, owners land on `/owner` (Owner Dashboard); players land on `/home`. Players who open `/owner` are redirected.

---

## Data model (Postgres)

Use UUID primary keys, `created_at` / `updated_at` columns, and RLS on every table.

| Table | Key columns |
|---|---|
| `profiles` | id (= auth.users.id), username (unique), avatar_url, role, coins (int, default 500), gems (int, default 0), xp, level, last_daily_claim |
| `seasons` | name, slug, description, theme_color, banner_url, starts_at, ends_at, status (`draft`/`active`/`ended`) |
| `sets` | season_id, name, code (e.g. `S1-BASE`), description, icon_url, total_cards |
| `rarities` | name (Common, Uncommon, Rare, Epic, Legendary, Mythic), color, glow_effect, sort_order |
| `cards` | set_id, name, number_in_set, description/flavor_text, art_url, rarity_id, element/type, hp, attack, defense, abilities (jsonb), is_limited_edition (bool), max_print_run (int, null = unlimited), printed_count (int), is_active |
| `card_instances` | card_id, owner_id, serial_number (only for limited editions, e.g. 7/100), foil (bool), acquired_from (`pack`/`trade`/`reward`/`market`), acquired_at |
| `packs` | name, description, art_url, season_id, price_coins, price_gems (nullable), cards_per_pack, is_limited_edition, total_supply (null = unlimited), sold_count, per_user_limit, available_from, available_until, is_active |
| `pack_slots` | pack_id, slot_index, rarity weights (jsonb, e.g. `{"Common":70,"Rare":25,"Epic":5}`), guaranteed_min_rarity_id, foil_chance |
| `pack_card_pool` | pack_id, card_id, weight override (optional) — limits which cards a pack can contain |
| `drops` | name, description, banner_url, season_id, starts_at, ends_at, status (`scheduled`/`live`/`ended`), countdown shown publicly |
| `drop_items` | drop_id, pack_id or card_id, quantity, special_price |
| `pack_openings` | user_id, pack_id, opened_at, results (jsonb of card_instance ids) — audit trail |
| `transactions` | user_id, type (`purchase`/`reward`/`refund`/`trade`/`market`/`admin_grant`), coins_delta, gems_delta, reference_id, note |
| `trades` | from_user, to_user, offered_instance_ids, requested_instance_ids, status |
| `market_listings` | seller_id, card_instance_id, price_coins, status |
| `achievements`, `user_achievements` | set-completion and milestone rewards |
| `audit_log` | actor_id, action, entity, entity_id, diff (jsonb) — written on every owner change |

---

## Game rules (enforced server-side)

All economy actions are **Postgres `security definer` RPC functions** run in a single transaction, so players can't cheat from the browser:

- `buy_and_open_pack(pack_id)` checks that the pack is active, inside its time window, has supply left, and is under the per-user limit, and that the player has enough coins/gems. It then deducts the price, rolls each slot using **server-side randomness** with the slot's rarity weights (respecting guarantees), picks cards from the pool, and creates `card_instances`. For limited-edition cards it locks the row (`FOR UPDATE`) and assigns the next serial number, skipping cards that have sold out. Finally it logs `pack_openings` and `transactions` and returns the results.
- `claim_daily_reward()` gives coins once every 24 hours.
- `create_trade`, `accept_trade`, `cancel_trade` swap ownership atomically.
- `list_on_market`, `buy_listing`, `cancel_listing`, with a small coin fee as a sink.
- `owner_grant_currency(user_id, coins, gems, note)` — owner only.
- Players may never write `coins`, `gems`, `card_instances`, or `printed_count` directly. RLS lets them read their own data and public catalog data only.

---

## Player experience

1. **Landing page:** hero section, the live drop with a countdown, featured packs, and sign up / log in.
2. **Auth:** sign up (choose a username), log in, log out, password reset, session persistence.
3. **Home:** coin/gem balance, daily reward button, the current season banner, live and upcoming drops, and recently pulled cards.
4. **Shop:** pack cards showing price, odds (always publish the drop rates), supply remaining for limited packs ("143 / 500 left"), and the time window. Includes a buy confirmation step.
5. **Pack opening:** an animated tear-open, then cards flip one by one (Framer Motion), with a rarity glow, foil shimmer, a special "LIMITED #7/100" reveal, and a skip / reveal-all option.
6. **Collection:** a grid of the player's cards, filterable by season, set, rarity, element, and limited edition. Shows duplicate counts and set-completion progress bars. A card detail modal shows a large card, stats, serial number, and acquisition date.
7. **Card visuals:** one reusable `<PackieCard>` component with a rarity-colored frame, art, name, HP/ATK/DEF, abilities, set code and number, a serial badge, and a 3D tilt/holo effect on hover for Epic and above.
8. **Trading and marketplace:** propose trades to other players, plus a coin marketplace with listings and history.
9. **Profile and leaderboard:** public profile with showcase cards, collection score, and achievements.
10. Responsive and mobile-first, with dark mode as the default. Packie branding is playful and vibrant.

---

## Owner Dashboard (`/owner`)

Sidebar layout with these sections. Each one has full create / read / update / delete, validation (zod + react-hook-form), image upload to Supabase Storage, and a live preview.

- **Overview:** KPIs (total players, packs opened today/week, coins spent, best-selling packs, limited editions remaining) with simple charts.
- **Cards:** create and edit cards (art upload, rarity, element, stats, abilities builder, set). Toggle **limited edition** and set **max print run**. Activate or deactivate cards. Bulk CSV import. A live `<PackieCard>` preview shows how the card will look.
- **Rarities:** edit names, colors, glow effects, and order.
- **Sets:** group cards into sets under a season.
- **Packs:** create packs with name, art, season, **pricing (coins and/or gems)**, cards per pack, and a **limited edition toggle with total supply** and a per-user limit. Set the availability window and the card pool. Includes a **slot editor** for rarity weights, guarantees, and foil chance. A built-in **odds simulator** opens 10,000 virtual packs and shows the resulting distribution before publishing.
- **Seasons:** create, schedule, activate, and end seasons, with theme color and banner.
- **Drops:** schedule drops with start and end times, attach packs or cards with quantities and special prices, and publish a public countdown. Status updates automatically from the timestamps.
- **Players:** search users, view their collection and transactions, grant or deduct coins/gems, and ban or unban.
- **Economy:** adjust the daily reward amount, starting balance, and marketplace fee, kept in a `game_settings` table.
- **Audit log:** a read-only history of every owner change.

---

## Seed data

Provide `supabase/seed.sql` with:

- 6 rarities
- 1 active season ("Season 1: Origins") with 1 set of 30 original cards across 5 elements (Fire, Water, Earth, Air, Shadow). Use placeholder art (generated gradient SVG with an element icon), **original names only — no Pokémon or other copyrighted IP**.
- 3 packs: Starter (100 coins, 5 cards), Premium (300 coins, 5 cards, 1 Rare+ guaranteed), and a Limited "Origins Founders" pack (1,000 supply, includes a Mythic limited edition with a 100-copy print run).
- 1 live drop with a countdown

Do **not** seed the owner's password. The trigger assigns the owner role when `decmar098@gmail.com` signs up.

---

## Quality bar

- TypeScript strict mode, ESLint, Prettier; no `any` in the app code.
- Loading, empty, and error states on every screen; toast notifications.
- Unit tests (Vitest) for the odds and weight logic, and SQL tests or scripted checks proving that RLS blocks players from owner tables and from editing their own balances.
- Run Supabase security and performance advisors after the migrations and fix what they find.
- A `README.md` covering setup, environment variables, how to run migrations and seed data, how the owner account works, and deployment to Vercel or Netlify.

---

## Build order

1. Scaffold the app, Tailwind, shadcn, router, and Supabase client.
2. Schema, RLS, and the role trigger; generate types.
3. Auth and role-based routing.
4. Owner Dashboard: rarities → seasons → sets → cards → packs (slot editor + simulator) → drops.
5. Economy RPCs (`buy_and_open_pack`, daily reward).
6. Player screens: shop, pack opening, collection.
7. Trading, marketplace, leaderboard, achievements.
8. Seed data, polish, tests, and the README.

Commit after each step with a clear message.
