-- OSDS Schema — Phase 3
-- Run this in the Supabase SQL Editor to set up all tables + RLS

-- ============================================================
-- TABLES
-- ============================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text default '',
  avatar_url text default '',
  favourite_walkers uuid[] default '{}',
  created_at timestamptz default now()
);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  breed text default '',
  weight numeric default null,
  age integer default null,
  notes text default '',
  created_at timestamptz default now()
);

create table public.walker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  slug text unique not null,
  business_name text not null default '',
  bio text default '',
  stripe_account_id text default null,
  theme_color text default '#4f46e5',
  is_default boolean default false,
  ical_url text default null,
  calendar_feed_token text default null,
  created_at timestamptz default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references public.walker_profiles(id) on delete cascade,
  name text not null,
  price_cents integer not null default 0,
  duration_minutes integer not null default 30,
  service_type text not null default 'standard' check (service_type in ('standard', 'overnight')),
  active boolean default true,
  created_at timestamptz default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references public.walker_profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references public.walker_profiles(id) on delete cascade,
  date date not null,
  reason text default '',
  created_at timestamptz default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references public.walker_profiles(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  stripe_session_id text default null,
  total_cents integer not null default 0,
  tip_cents integer not null default 0,
  status text not null default 'paid' check (status in ('paid', 'refunded', 'partially_refunded')),
  source text not null default 'stripe' check (source in ('stripe', 'cash')),
  receipt_url text default null,
  created_at timestamptz default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references public.walker_profiles(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  batch_id uuid default null,
  booking_date date not null,
  start_time time not null,
  end_date date default null,
  end_time time default null,
  capacity integer not null default 1,
  status text not null default 'requested' check (status in ('requested', 'approved', 'hold', 'confirmed', 'pending', 'cancelled', 'declined', 'refunded')),
  reopened_slots jsonb default '[]',
  created_at timestamptz default now()
);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  pet_details jsonb default null,
  created_at timestamptz default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references public.walker_profiles(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  device_type text default '',
  created_at timestamptz default now()
);

-- ============================================================
-- AUTO-CREATE USER ROW ON SIGN-UP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.pets enable row level security;
alter table public.walker_profiles enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.payments enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.reviews enable row level security;
alter table public.push_subscriptions enable row level security;

-- users: read/update own row
create policy "Users can read own row" on public.users
  for select using (auth.uid() = id);
create policy "Users can update own row" on public.users
  for update using (auth.uid() = id);
create policy "Walker can read booking clients" on public.users
  for select using (
    exists (
      select 1 from public.bookings b
      join public.walker_profiles wp on wp.id = b.walker_id
      where b.client_id = users.id and wp.user_id = auth.uid()
    )
  );

-- pets: CRUD own
create policy "Users can read own pets" on public.pets
  for select using (auth.uid() = user_id);
create policy "Walker can read pets in their bookings" on public.pets
  for select using (
    exists (
      select 1 from public.booking_items bi
      join public.bookings b on b.id = bi.booking_id
      join public.walker_profiles wp on wp.id = b.walker_id
      where bi.pet_id = pets.id and wp.user_id = auth.uid()
    )
  );
create policy "Users can insert own pets" on public.pets
  for insert with check (auth.uid() = user_id);
create policy "Users can update own pets" on public.pets
  for update using (auth.uid() = user_id);
create policy "Users can delete own pets" on public.pets
  for delete using (auth.uid() = user_id);

-- walker_profiles: public read, owner write
create policy "Anyone can read walker profiles" on public.walker_profiles
  for select using (true);
create policy "Owner can insert walker profile" on public.walker_profiles
  for insert with check (auth.uid() = user_id);
create policy "Owner can update walker profile" on public.walker_profiles
  for update using (auth.uid() = user_id);

-- services: public read active, walker owner CRUD
create policy "Anyone can read active services" on public.services
  for select using (true);
create policy "Walker can insert services" on public.services
  for insert with check (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Walker can update services" on public.services
  for update using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Walker can delete services" on public.services
  for delete using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );

-- availability: public read, walker owner CRUD
create policy "Anyone can read availability" on public.availability
  for select using (true);
create policy "Walker can insert availability" on public.availability
  for insert with check (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Walker can update availability" on public.availability
  for update using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Walker can delete availability" on public.availability
  for delete using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );

-- blocked_dates: public read, walker owner CRUD
create policy "Anyone can read blocked dates" on public.blocked_dates
  for select using (true);
create policy "Walker can insert blocked dates" on public.blocked_dates
  for insert with check (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Walker can update blocked dates" on public.blocked_dates
  for update using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Walker can delete blocked dates" on public.blocked_dates
  for delete using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );

-- payments: walker or client can read own
create policy "Users can read own payments" on public.payments
  for select using (
    auth.uid() = client_id or
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );

-- bookings: walker or client can read own, walker can update
create policy "Users can read own bookings" on public.bookings
  for select using (
    auth.uid() = client_id or
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );
create policy "Users can insert bookings" on public.bookings
  for insert with check (auth.uid() = client_id);
create policy "Walker can update bookings" on public.bookings
  for update using (
    exists (select 1 from public.walker_profiles where id = walker_id and user_id = auth.uid())
  );

-- booking_items: readable by booking owner
create policy "Users can read own booking items" on public.booking_items
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and (
        b.client_id = auth.uid() or
        exists (select 1 from public.walker_profiles wp where wp.id = b.walker_id and wp.user_id = auth.uid())
      )
    )
  );
create policy "Users can insert booking items" on public.booking_items
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.client_id = auth.uid()
    )
  );

-- reviews: public read, client writes own
create policy "Anyone can read reviews" on public.reviews
  for select using (true);
create policy "Client can insert review" on public.reviews
  for insert with check (auth.uid() = client_id);

-- push_subscriptions: user CRUD own
create policy "Users can read own subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
