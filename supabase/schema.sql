create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('subscriber', 'admin')),
  country text not null,
  about text not null default '',
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists charities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  location text not null,
  short_description text not null,
  description text not null,
  impact_metric text not null,
  tags text[] not null default '{}',
  featured boolean not null default false,
  spotlight boolean not null default false,
  active boolean not null default true,
  accent text not null,
  glow text not null,
  mesh text not null,
  created_at timestamptz not null default now()
);

create table if not exists charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references charities(id) on delete cascade,
  title text not null,
  event_date date not null,
  venue text not null
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null check (status in ('active', 'inactive', 'cancelled', 'lapsed')),
  amount_cents integer not null check (amount_cents >= 0),
  payment_provider text not null,
  started_at timestamptz not null,
  renewal_date date not null,
  cancelled_at timestamptz,
  charity_id uuid not null references charities(id),
  charity_percentage integer not null check (charity_percentage between 10 and 100),
  access_restricted boolean not null default false
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  played_on date not null,
  stableford_score integer not null check (stableford_score between 1 and 45),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, played_on)
);

create table if not exists draws (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique,
  label text not null,
  status text not null check (status in ('scheduled', 'published')),
  logic text not null check (logic in ('random', 'algorithmic')),
  numbers integer[] not null default '{}',
  active_subscriber_count integer not null default 0,
  prize_pool_cents integer not null default 0,
  rollover_from_previous_cents integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists draw_tiers (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws(id) on delete cascade,
  tier text not null check (tier in ('match5', 'match4', 'match3')),
  share_percentage integer not null,
  pool_cents integer not null default 0,
  amount_each_cents integer not null default 0,
  rollover_enabled boolean not null default false,
  rollover_cents integer not null default 0,
  unique (draw_id, tier)
);

create table if not exists draw_winners (
  id uuid primary key default gen_random_uuid(),
  draw_tier_id uuid not null references draw_tiers(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  matched_numbers integer[] not null,
  amount_cents integer not null default 0,
  verification_status text not null check (verification_status in ('pending', 'approved', 'rejected')),
  payment_status text not null check (payment_status in ('pending', 'paid')),
  proof_image text,
  proof_submitted_at timestamptz,
  reviewed_at timestamptz,
  review_notes text
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  audience text not null check (audience in ('user', 'admin', 'system')),
  kind text not null check (kind in ('welcome', 'subscription', 'draw', 'winner', 'verification', 'system')),
  subject text not null,
  preview text not null,
  body text not null,
  status text not null check (status in ('queued', 'sent')),
  created_at timestamptz not null default now()
);

create index if not exists scores_profile_id_played_on_idx on scores (profile_id, played_on desc);
create index if not exists subscriptions_profile_id_idx on subscriptions (profile_id);
create index if not exists draw_winners_profile_id_idx on draw_winners (profile_id);

