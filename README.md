# Packie

A digital collectible card game: rip packs, chase numbered limited editions, complete sets, trade, and climb the leaderboard. The owner runs the whole game from a built-in **Owner Dashboard**.

**Stack:** Vite + React 18 + TypeScript + Tailwind + Framer Motion, with **Supabase** (Auth, Postgres, RLS, Storage, RPC) as the backend.

## Features

**Players**
- Animated pack opening: tear the wrapper, flip each card, with rarity bursts and a summary screen
- Holographic cards with 3D tilt, foil shimmer and a prismatic Mythic frame. Each card without uploaded art gets a unique, procedurally generated creature.
- Shop with published per-slot drop rates, live-drop discounts and supply bars for limited packs
- Collection with set-completion progress, filters, and a "show missing" view
- Marketplace (buy and sell for coins, with an owner-set fee), player-to-player trades, leaderboard, public profiles
- Daily rewards, XP and levels

**Owner Dashboard** (`/owner`)
- **Overview:** players, packs opened, coins spent, top packs, and remaining limited-edition copies
- **Cards:** create and edit cards with a live preview, upload art, set limited edition and print run, bulk CSV import
- **Packs & pricing:** coin and/or gem prices, limited supply, per-player limits and sale windows. Also includes a per-slot rarity odds editor, a custom card pool, and a **10,000-pack simulator**.
- **Drops:** scheduled events with countdowns, special pack prices and featured chase cards
- **Seasons, Sets, Rarities:** full create/edit/delete, plus colors and glow effects
- **Players:** grant or deduct coins and gems, give cards, ban or unban, view activity
- **Economy:** starting balance, daily reward and market fee
- **Audit log:** every owner change is recorded automatically

## Security model

- Every coin and card movement goes through `security definer` Postgres functions (`buy_and_open_pack`, `buy_listing`, `respond_trade`, …). Each one runs in a single transaction and uses **server-side randomness**.
- Row Level Security blocks players from writing balances, cards or transactions directly. Players can only edit their own username, avatar and bio.
- The owner role is granted by a database trigger only to `decmar098@gmail.com`. Owner-only writes are enforced in Postgres with `is_owner()`; the frontend route guard only controls what the interface shows.
- The Supabase publishable key in `src/lib/supabase.ts` is designed to be public. RLS is what protects the data.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # odds engine unit tests
npm run lint
npm run build
```

The app is already wired to the Supabase project `packie` (`ievkiawudzjppnlfgouz`). To point it at a different project, copy `.env.example` to `.env.local` and change the values.

## Database

The migrations in `supabase/migrations/` and the starter content in `supabase/seed.sql` have already been applied to the live project. To set up a fresh project, run the migrations in order and then run `seed.sql`, using the Supabase SQL editor or `supabase db push`.

## Deploying to Netlify

1. In Netlify, choose **Add new site → Import an existing project → GitHub** and pick this repo.
2. Netlify reads `netlify.toml` automatically (build command `npm run build`, publish directory `dist`, SPA redirects). Click **Deploy**.
3. Optional: under **Site settings → Environment variables**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The build already falls back to the Packie project if you skip this.
4. **Important:** in Supabase, go to **Authentication → URL Configuration**:
   - set **Site URL** to your Netlify URL (e.g. `https://packie.netlify.app`)
   - add `https://packie.netlify.app/**` to **Redirect URLs**

   Without this, sign-up confirmation and password-reset emails link back to `localhost`.

## Owner account

The owner account `decmar098@gmail.com` already exists and is confirmed. Log in and you'll land on the Owner Dashboard. Change the password any time from the **Forgot password?** link.

## Notes

- Supabase's built-in email sender is rate-limited (a few emails per hour). Before launch, add your own SMTP provider under **Authentication → Emails**, or turn off **Confirm email** while testing.
- Coins and gems are virtual and can't be bought with real money yet. Adding real payments (e.g. Stripe) would be a natural next step.
