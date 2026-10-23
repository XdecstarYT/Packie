-- Packie starter content: rarities, Season 1, 30 original cards, 3 packs, 1 live drop.
-- Safe to run once on a fresh database.

select set_config('packie.skip_audit', 'on', false);

insert into public.rarities (slug, name, color, glow, points, sort_order) values
  ('common',    'Common',    '#94a3b8', 'none',      1,   1),
  ('uncommon',  'Uncommon',  '#22c55e', 'soft',      3,   2),
  ('rare',      'Rare',      '#3b82f6', 'soft',      10,  3),
  ('epic',      'Epic',      '#a855f7', 'strong',    30,  4),
  ('legendary', 'Legendary', '#f59e0b', 'strong',    100, 5),
  ('mythic',    'Mythic',    '#f43f5e', 'prismatic', 500, 6);

insert into public.seasons (name, slug, description, theme_color, starts_at, ends_at, status) values
  ('Season 1: Origins', 's1-origins',
   'Where every legend begins. Six elements awaken across the realm of Packaria.',
   '#8b5cf6', now() - interval '1 day', now() + interval '90 days', 'active');

insert into public.sets (season_id, name, code, description)
select id, 'Origins Base Set', 'S1-BASE', 'The first 30 creatures of Packaria.'
from public.seasons where slug = 's1-origins';

with s as (select id from public.sets where code = 'S1-BASE'),
r as (select slug, id from public.rarities),
data (num, name, rarity, element, hp, atk, def, flavor, a1, a1dmg, a1txt, limited, print_run) as (values
  (1,  'Emberkit',              'common',    'fire',   40, 14,  8, 'Its tail flickers brighter when it is happy.',               'Spark Pounce', 20, 'A quick leap wrapped in sparks.', false, null),
  (2,  'Cinderpup',             'common',    'fire',   45, 12, 10, 'Leaves warm pawprints in the snow.',                        'Ash Nip',      15, 'May leave the target singed.', false, null),
  (3,  'Sparkwick',             'common',    'fire',   35, 16,  6, 'A living candle that never melts.',                         'Wick Flare',   25, 'Burns brightest in the dark.', false, null),
  (4,  'Puddlefin',             'common',    'water',  45, 10, 12, 'Can be found napping in rain puddles.',                     'Splash Slap',  15, 'Soaks the target.', false, null),
  (5,  'Driplet',               'common',    'water',  38, 11, 11, 'Made of a single raindrop that refused to fall.',           'Drizzle',      15, 'Heals 10 HP to itself.', false, null),
  (6,  'Tidepip',               'common',    'water',  42, 13,  9, 'Rides the smallest waves with great pride.',                'Ripple Kick',  20, 'A tiny but mighty wave.', false, null),
  (7,  'Pebblet',               'common',    'earth',  55,  9, 16, 'Rolls downhill just for fun.',                              'Rock Roll',    15, 'Gains defense while rolling.', false, null),
  (8,  'Mossbun',               'common',    'earth',  48, 10, 14, 'Grows a fresh coat of moss every spring.',                  'Leaf Thump',   15, 'Soft, but surprisingly heavy.', false, null),
  (9,  'Breezle',               'common',    'air',    36, 14,  7, 'Hums a tune only the wind can hear.',                       'Gust Twirl',   20, 'Spins the target around.', false, null),
  (10, 'Puffowl',               'common',    'air',    40, 12,  9, 'Its feathers are lighter than clouds.',                     'Fluff Dive',   20, 'Strikes from above.', false, null),
  (11, 'Gloomite',              'common',    'shadow', 38, 15,  8, 'Glows faintly purple at midnight.',                         'Murk Bite',    20, 'Hard to see coming.', false, null),
  (12, 'Dusk Moth',             'common',    'shadow', 34, 13,  9, 'Drawn to lanterns, afraid of the sun.',                     'Dust Veil',    15, 'Lowers the target''s accuracy.', false, null),
  (13, 'Magmaw',                'uncommon',  'fire',   70, 22, 14, 'Swallows lava like soup.',                                  'Molten Chomp', 35, 'Burns for 10 extra damage.', false, null),
  (14, 'Coralisk',              'uncommon',  'water',  68, 18, 20, 'Its spines are a living reef.',                             'Reef Spike',   30, 'Pierces through shields.', false, null),
  (15, 'Thornback',             'uncommon',  'earth',  80, 16, 24, 'Wears a coat of brambles as armor.',                        'Bramble Wall', 25, 'Reflects 10 damage.', false, null),
  (16, 'Rootling Sage',         'uncommon',  'earth',  72, 15, 22, 'Has been thinking about one idea for 300 years.',            'Deep Roots',   25, 'Heals 20 HP.', false, null),
  (17, 'Galehawk',              'uncommon',  'air',    62, 24, 12, 'Can outfly a thunderstorm.',                                'Talon Gale',   35, 'Always strikes first.', false, null),
  (18, 'Mistral Imp',           'uncommon',  'air',    58, 21, 13, 'A prankster riding on cold northern winds.',                'Chill Trick',  30, 'Freezes the target for a turn.', false, null),
  (19, 'Shadefox',              'uncommon',  'shadow', 60, 23, 12, 'Has nine tails, but only shows you one.',                   'Phantom Swipe',35, 'Ignores 10 defense.', false, null),
  (20, 'Pyroclaw',              'rare',      'fire',   95, 32, 20, 'Its claws are forged in a volcano''s heart.',               'Inferno Rend', 55, 'Burns everything it touches.', false, null),
  (21, 'Abyssal Ray',           'rare',      'water',  90, 28, 26, 'Glides through the deepest, darkest trenches.',             'Abyss Pulse',  50, 'Drains 20 HP.', false, null),
  (22, 'Ironbark Golem',        'rare',      'earth', 120, 24, 36, 'An ancient tree that learned to walk.',                     'Timber Crash', 45, 'Stuns on a coin flip.', false, null),
  (23, 'Stormrider',            'rare',      'air',    88, 34, 18, 'Surfs on lightning between the clouds.',                    'Thunder Lance',60, 'Chains to a second target.', false, null),
  (24, 'Nightveil Lynx',        'rare',      'shadow', 86, 33, 19, 'Walks between shadows without a sound.',                    'Eclipse Pounce',55, 'Cannot be blocked.', false, null),
  (25, 'Infernox',              'epic',      'fire',  130, 44, 28, 'When it roars, the sky turns orange.',                      'Supernova',    80, 'Damages all enemies.', false, null),
  (26, 'Leviathorn',            'epic',      'water', 140, 40, 34, 'Older than the oceans it rules.',                           'Tidal Crown',  75, 'Washes away all buffs.', false, null),
  (27, 'Umbral Wraith',         'epic',      'shadow',120, 46, 24, 'A whisper from the void given form.',                       'Soul Siphon',  80, 'Steals 30 HP.', false, null),
  (28, 'Terragon the Ancient',  'legendary', 'earth', 180, 50, 48, 'The first mountain was its sleeping back.',                 'World Shaker', 110,'Shakes the whole battlefield.', false, null),
  (29, 'Zephyra, Sky Empress',  'legendary', 'air',   160, 58, 34, 'All winds bow when she spreads her wings.',                 'Celestial Gale',120,'Hits twice.', true, 500),
  (30, 'Solarion, Dawnbringer', 'mythic',    'light', 220, 70, 55, 'Only one hundred have ever seen its light and lived to tell.','Dawn Eternal', 160,'Restores all allies to full HP.', true, 100)
)
insert into public.cards (set_id, name, number_in_set, rarity_id, element, hp, attack, defense, flavor_text, abilities, is_limited_edition, max_print_run)
select (select id from s), d.name, d.num, r.id, d.element, d.hp, d.atk, d.def, d.flavor,
       jsonb_build_array(jsonb_build_object('name', d.a1, 'damage', d.a1dmg, 'text', d.a1txt)),
       d.limited, d.print_run
from data d join r on r.slug = d.rarity;

insert into public.packs (name, description, theme_color, season_id, price_coins, price_gems, slots, is_limited_edition, total_supply, per_user_limit, is_active, sort_order)
select 'Starter Pack', 'Five cards to kick off your collection. A great way to fill out your binder.', '#22c55e', s.id, 100, null,
  '[
    {"label":"Card 1","weights":{"common":80,"uncommon":18,"rare":2},"foil_chance":0.02},
    {"label":"Card 2","weights":{"common":80,"uncommon":18,"rare":2},"foil_chance":0.02},
    {"label":"Card 3","weights":{"common":80,"uncommon":18,"rare":2},"foil_chance":0.02},
    {"label":"Card 4","weights":{"common":50,"uncommon":35,"rare":12,"epic":3},"foil_chance":0.04},
    {"label":"Bonus","weights":{"uncommon":55,"rare":30,"epic":10,"legendary":4,"mythic":1},"foil_chance":0.06}
  ]'::jsonb, false, null, null, true, 1
from public.seasons s where s.slug = 's1-origins';

insert into public.packs (name, description, theme_color, season_id, price_coins, price_gems, slots, is_limited_edition, total_supply, per_user_limit, is_active, sort_order)
select 'Premium Pack', 'Five cards with a guaranteed Rare or better in the last slot, plus better foil odds.', '#3b82f6', s.id, 300, 3,
  '[
    {"label":"Card 1","weights":{"common":60,"uncommon":35,"rare":5},"foil_chance":0.05},
    {"label":"Card 2","weights":{"common":60,"uncommon":35,"rare":5},"foil_chance":0.05},
    {"label":"Card 3","weights":{"uncommon":60,"rare":30,"epic":10},"foil_chance":0.08},
    {"label":"Card 4","weights":{"uncommon":60,"rare":30,"epic":10},"foil_chance":0.08},
    {"label":"Guaranteed Rare+","weights":{"rare":70,"epic":22,"legendary":6,"mythic":2},"foil_chance":0.15}
  ]'::jsonb, false, null, null, true, 2
from public.seasons s where s.slug = 's1-origins';

insert into public.packs (name, description, theme_color, season_id, price_coins, price_gems, slots, is_limited_edition, total_supply, per_user_limit, is_active, sort_order)
select 'Origins Founders Pack', 'Only 1,000 will ever be opened. Epic or better guaranteed, with the best odds in the game at the Mythic Solarion (only 100 printed).', '#f43f5e', s.id, 1000, 10,
  '[
    {"label":"Card 1","weights":{"uncommon":50,"rare":40,"epic":10},"foil_chance":0.2},
    {"label":"Card 2","weights":{"uncommon":50,"rare":40,"epic":10},"foil_chance":0.2},
    {"label":"Card 3","weights":{"rare":70,"epic":25,"legendary":5},"foil_chance":0.25},
    {"label":"Card 4","weights":{"rare":70,"epic":25,"legendary":5},"foil_chance":0.25},
    {"label":"Founders Chase","weights":{"epic":70,"legendary":25,"mythic":5},"foil_chance":0.35}
  ]'::jsonb, true, 1000, 10, true, 3
from public.seasons s where s.slug = 's1-origins';

insert into public.drops (name, description, theme_color, season_id, starts_at, ends_at, is_published)
select 'Origins Launch Drop', 'Packie is live! Founders Packs are 20% off for launch week. Chase the Mythic Solarion before it''s gone.', '#f43f5e', s.id,
       now() - interval '1 hour', now() + interval '7 days', true
from public.seasons s where s.slug = 's1-origins';

insert into public.drop_items (drop_id, pack_id, special_price_coins)
select d.id, p.id, 800 from public.drops d, public.packs p
where d.name = 'Origins Launch Drop' and p.name = 'Origins Founders Pack';

insert into public.drop_items (drop_id, card_id)
select d.id, c.id from public.drops d, public.cards c
where d.name = 'Origins Launch Drop' and c.name in ('Solarion, Dawnbringer', 'Zephyra, Sky Empress', 'Terragon the Ancient');

-- Upcoming drop to show off countdowns.
insert into public.drops (name, description, theme_color, season_id, starts_at, ends_at, is_published)
select 'Shadow Week', 'The shadows grow long... a special drop is coming.', '#a855f7', s.id,
       now() + interval '10 days', now() + interval '17 days', true
from public.seasons s where s.slug = 's1-origins';
