-- Phase 7: Notifications + Emails
-- Run this migration against your Supabase project

-- 1. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text default null,
  read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- 2. Notification preferences on users
alter table public.users add column if not exists notification_preferences jsonb
  not null default '{"email_new_request":true,"email_approval":true,"email_cancellation":true,"email_reminders":true,"push_new_request":true,"push_approval":true,"push_cancellation":true,"push_reminders":false}';

-- 3. Unique constraint on push_subscriptions endpoint (prevent duplicate device registrations)
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_unique;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_unique unique (endpoint);
