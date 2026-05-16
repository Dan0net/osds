-- New walkers default to maximum availability (every day, all hours).
-- Extends handle_new_user to seed seven rows in public.availability for each
-- walker created via signup. Existing walkers are not touched — they may have
-- already configured their own availability.
--
-- end_time is set to 23:59:00 rather than 24:00:00 so the value round-trips
-- through HTML <input type="time"> in AccountAvailability without clipping.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  _name text;
  _slug text;
  _walker_id uuid;
begin
  _name := coalesce(new.raw_user_meta_data->>'name', '');

  insert into public.users (id, name, email, postcode)
  values (
    new.id,
    _name,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'postcode', '')), '')
  );

  if new.raw_user_meta_data->>'role' = 'walker' then
    _slug := lower(regexp_replace(regexp_replace(_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'));
    if _slug = '' then
      _slug := 'walker-' || substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8);
    end if;
    if exists (select 1 from public.walker_profiles where slug = _slug) then
      _slug := _slug || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);
    end if;

    insert into public.walker_profiles (user_id, slug, business_name, postcode, calendar_feed_token)
    values (
      new.id,
      _slug,
      _name || '''s Dog Walking',
      nullif(trim(coalesce(new.raw_user_meta_data->>'postcode', '')), ''),
      encode(extensions.gen_random_bytes(16), 'hex')
    )
    returning id into _walker_id;

    insert into public.availability (walker_id, day_of_week, start_time, end_time)
    select _walker_id, dow, '00:00:00'::time, '23:59:00'::time
    from generate_series(1, 7) as dow;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = '';
