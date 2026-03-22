# Build Phases

## Phase 1 — Scaffold + Deploy

- [ ] `npm create vite@latest . -- --template react` + Tailwind setup
- [ ] PWA: `manifest.json`, service worker shell
- [ ] `netlify.toml` with functions directory and SPA fallback
- [ ] Netlify deploy: connect repo, env vars
- [ ] DNS: custom domain `onestopdog.shop`, wildcard CNAME `*.onestopdog.shop → Netlify`
- [ ] `.env.example` with all required keys
- [ ] Project structure:

```
osds/
├── src/
│   ├── components/        # Shared UI
│   ├── pages/
│   │   ├── public/        # Landing, WalkerPage, BookingFlow, Confirmation, Login, Signup
│   │   └── account/       # AccountLayout, Dashboard, Bookings, Pets, Payments, Inbox, Profile, Settings
│   ├── lib/
│   │   ├── supabase.js    # Supabase client init
│   │   ├── api.js         # Fetch wrappers for Netlify Functions
│   │   ├── walker.js      # Resolve walker from subdomain or /w/:slug path
│   │   └── utils.js       # Date/time helpers
│   ├── hooks/             # useWalker, useAuth, useBookings, etc.
│   ├── context/           # AuthContext, WalkerContext
│   ├── App.jsx
│   └── main.jsx
├── netlify/functions/
├── public/
├── netlify.toml
├── tailwind.config.js
└── .env.example
```

**Milestone:** Blank app deployed to `onestopdog.shop` and `*.onestopdog.shop`, HTTPS working, wildcard subdomain resolves.

---

## Phase 2 — UI Shells (mock data, no backend)

All pages built with hardcoded mock data. One user (Ellie) who is both a walker and a client. No Supabase, Stripe, or function wiring. Mobile-responsive from the start.

- [ ] Subdomain + `/w/:slug` routing — hardcoded to resolve "ellie"
- [ ] Platform landing page at `onestopdog.shop` — value prop, how it works, walker showcase, single sign-up CTA
- [ ] Walker landing page (`ellie.onestopdog.shop`) — bio, services, mock reviews, "Book Now" CTA
- [ ] Booking flow: select service → pick date → pick time slots → pick pet → submit request → confirmation page
- [ ] Auth screens: sign-up / login (single account, no role toggle)
- [ ] Account section `/account` with:
  - [ ] Dashboard — overview: upcoming bookings, pending requests (if walker), walker page link
  - [ ] Bookings — tabbed: incoming requests (walker) + my bookings (client), approve/decline, favourites
  - [ ] Pets — CRUD for user's pets
  - [ ] Payments — payment history, Stripe dashboard link (if walker)
  - [ ] Inbox — mock notifications
  - [ ] Profile — personal info + walker profile fields (if walker), Stripe connect
  - [ ] Settings — services CRUD, availability editor, calendar sync (all conditional on walker profile)
- [ ] Mobile-responsive across all pages (Tailwind breakpoints)

**Milestone:** Every user journey clickable end-to-end. Platform landing → sign-up. Walker page → book → confirm. Account: dashboard, bookings (client + walker views), pets, payments, inbox, profile, settings. All with mock data.

---

## Phase 3 — Auth + DB Foundation

- [ ] Supabase project: create all tables (`users`, `pets`, `walker_profiles`, `services`, etc.), RLS policies
- [ ] Supabase Auth for sign-up/login (single account)
- [ ] Protected route guards (account pages require auth)
- [ ] Walker landing page resolves from DB (replace mock data)
- [ ] Profile editor wired to DB (user + walker profile)

**Milestone:** Real sign-up/login. Walker pages load from DB. Unauthenticated users redirected. Any user can create a walker profile from account settings.

**Validation:**
1. Go to `/signup`, create account with real email → should redirect to `/account`, name visible in header
2. Log out → navigate to `/account` directly → should redirect to `/login`
3. Log in with the account just created → should land on `/account`
4. Refresh page while logged in → session persists, still on `/account`
5. Go to `/account/profile` → edit name, save → refresh → name persisted
6. Click "Create Walker Profile" → walker fields appear, slug generated from your name (e.g. "Daniel" → `daniel`)
7. Edit business name + bio, save → refresh → walker profile persisted
8. Visit `/w/daniel` (or whatever slug was generated in step 6) → walker page loads from DB (business name, bio visible)
9. Visit `/w/nonexistent` → shows "Walker not found" error
10. Open Supabase Table Editor → verify `users` and `walker_profiles` rows exist with correct data
11. In Supabase Auth dashboard → verify sign-up event logged, email matches

---

## Phase 4 — Booking Request Flow

- [ ] Services CRUD wired to DB
- [ ] Availability editor wired to DB (day-of-week hours, blocked dates)
- [ ] `get-availability` function — slot computation from availability + existing bookings
- [ ] `create-booking-request` — user submits request → status `requested`
- [ ] Account bookings: real data, `approve-booking` / `decline-booking` wired
- [ ] Capacity + `blocks_slot` logic in availability computation

**Milestone:** User requests a booking → walker sees it in account → approves or declines → status updates visible to both. Full request loop working end-to-end.

**Validation:**
1. As walker: go to `/account/settings` → add a service (e.g. "30-min Walk", £15, 30 min) → refresh → service persisted
2. Toggle service inactive → refresh → service shows as inactive
3. Set availability: enable Mon–Fri 09:00–17:00 → refresh → schedule persisted
4. Add a blocked date → refresh → blocked date persisted
5. As client: visit walker page → "Book a slot" calendar shows only available days
6. Pick a date → time slots match walker's availability minus blocked dates
7. Select service + pet + time slot → submit request → redirected to confirmation
8. Check Supabase: `bookings` row with status `requested`, `service_id` and `pet_id` set, `payment_id` linking to payment group
9. As walker: go to `/account/bookings` → incoming request visible with correct details
10. Approve the request → status changes to `approved`, client sees update
11. Decline a different request → status changes to `declined`, client sees update
12. Test capacity: create a service with capacity > 1 → book multiple clients into same slot → verify it allows up to capacity then blocks
13. Test blocked date: try to book on a blocked date → no slots shown

---

## Phase 5 — Payments

- [ ] Stripe Connect onboarding for walkers (`stripe-connect-onboard`, `stripe-connect-callback`)
- [ ] `create-checkout` — Stripe Checkout for approved bookings, hold bookings created
- [ ] `stripe-webhook` — holds promoted to confirmed, payment record created
- [ ] `admin-create-booking` — walker creates on behalf of client (mark paid / send link)
- [ ] `cancel-booking` — cancel + refund (full/partial)
- [ ] `reschedule-booking` — update date/time
- [ ] Stripe Express Dashboard link for walkers

**Milestone:** Full money flow: request → approve → pay via Stripe → confirmed. Walker can also book on behalf of client. Refunds and cancellations work.

**Validation:**
1. As walker: go to `/account/profile` → click "Connect Stripe Account" → complete Stripe Express onboarding → redirected back, `stripe_account_id` saved
2. As walker: click Stripe Dashboard link → opens Stripe Express Dashboard
3. Client requests booking → walker approves → payment link email sent
4. Client clicks payment link → Stripe Checkout opens with correct amount
5. Complete payment (use Stripe test card `4242 4242 4242 4242`) → redirected to confirmation page → booking status = `confirmed`
6. Check Supabase: `payments` row with `status: paid`, `source: stripe`, correct `total_cents`
7. As walker: create booking on behalf of client → choose "Mark as paid" → booking immediately `confirmed`, `source: cash`
8. As walker: create booking on behalf of client → choose "Send payment link" → booking status `pending`, client receives email with Checkout link
9. Cancel a confirmed Stripe booking → refund issued, booking status = `refunded`, check Stripe dashboard for refund
10. Reschedule a booking → date/time updated, client notified, old slot freed
11. Let a Checkout session expire (wait 30 min or shorten expiry) → hold bookings released, slots reopen
12. Test partial refund on a multi-booking payment → verify correct amount refunded

---

## Phase 6 — Calendar Sync

- [ ] Import: walker pastes iCal URL → `get-availability` subtracts external busy times
- [ ] Export: `calendar-feed` generates .ics feed per walker
- [ ] Cache external iCal fetches (short TTL)

**Milestone:** Walker's external calendar blocks availability. Bookings appear in walker's Google/Apple Calendar via subscription.

**Validation:**
1. As walker: go to Settings → paste a Google Calendar iCal URL (share → "Secret address in iCal format")
2. View walker page → dates/times that overlap with Google Calendar events should be blocked
3. Add a new event in Google Calendar → wait for cache TTL → re-check availability → new event blocks the slot
4. As walker: copy the export subscribe URL from Settings
5. Add the URL as a calendar subscription in Google Calendar / Apple Calendar → confirmed bookings appear as events
6. Create a new confirmed booking → refresh subscribed calendar → new event appears
7. Cancel a booking → refresh subscribed calendar → event removed
8. Test with an invalid/unreachable iCal URL → should fail gracefully, not break availability
9. Test iCal import with a private IP range URL (e.g. `http://192.168.1.1/cal.ics`) → should be rejected (SSRF protection)

---

## Phase 7 — Notifications + Emails

- [ ] Resend integration: confirmation, approval, decline, cancellation, reschedule emails
- [ ] `save-push-subscription` + `send-push` functions
- [ ] Wire push triggers: new request → walker, approval/decline → client, payment → walker, cancellation → both, reminders → both
- [ ] iOS "Add to Home Screen" prompt for push support

**Milestone:** Both walkers and clients receive email and push notifications for all booking lifecycle events.

**Validation:**
1. Client submits booking request → walker receives email notification with booking details
2. Walker approves → client receives email with payment link
3. Walker declines → client receives decline email
4. Client pays → walker receives payment confirmation email
5. Booking cancelled → both walker and client receive cancellation email
6. Booking rescheduled → client receives reschedule email with new date/time
7. Check Resend dashboard → all emails delivered, no bounces
8. On Chrome (desktop): allow push notifications → verify browser prompt appears
9. On Chrome (Android): allow push → booking request triggers push to walker
10. Subscribe to push on two devices → both receive notifications
11. On iOS: add to home screen → verify push permission prompt works
12. Check Supabase `push_subscriptions` table → entries match subscribed devices
13. Unsubscribe from push → no more notifications, row removed from table

---

## Phase 8 — Reviews, Tipping, Favourites

- [ ] `submit-review` function + review display on walker page
- [ ] Tipping on confirmation page (tip added to payment via `tip_cents`)
- [ ] Favourite walkers list in client dashboard

**Milestone:** Clients can review completed bookings, tip, and save walkers to favourites. Reviews visible on walker pages.

**Validation:**
1. Complete a booking (confirmed status) → go to confirmation page → review form visible
2. Submit review with 4 stars + comment → check Supabase `reviews` table → row created
3. Visit walker page → review appears in reviews section with correct name, rating, comment
4. Try to review a booking that's not `confirmed` → should not be allowed
5. Try to review the same booking twice → should be rejected
6. On confirmation page → add a £5 tip → check `payments.tip_cents` = 500
7. On confirmation page → skip the tip → `tip_cents` = 0
8. As client: visit walker page → click favourite (heart) → walker added to favourites
9. Go to `/account` dashboard → favourite walkers list shows the walker
10. Unfavourite → walker removed from list, `favourite_walkers[]` updated
11. Check Supabase `users` table → `favourite_walkers` array matches UI state

---

## Phase 9 — Testing + Launch Readiness

- [ ] End-to-end smoke test: walker sign-up → profile → services → availability → client books → request → approve → pay → confirm → review + tip
- [ ] Edge cases: expired checkout sessions, double-booking attempts, capacity limits, blocks_slot behaviour
- [ ] Payment edge cases: partial refunds, cash bookings, resent payment links
- [ ] Auth edge cases: invalid tokens, expired sessions, cross-walker data isolation
- [ ] Push notification delivery across Android Chrome, iOS PWA, desktop
- [ ] Calendar sync: import accuracy, export subscription refresh
- [ ] Mobile UX audit across iOS Safari, Android Chrome
- [ ] Security checklist: RLS policies, webhook signature verification, subdomain spoofing, iCal SSRF protection, rate limiting
- [ ] Loading states, error boundaries, empty states
- [ ] SEO: meta tags, Open Graph for walker pages and platform landing

**Milestone:** All user flows verified across devices and browsers. Security hardened. Ready to onboard additional walkers beyond the initial pilot.

---

## Phase 10 — Social Login (OAuth)

- [ ] Enable Google + Apple OAuth providers in Supabase dashboard
- [ ] Add "Continue with Google" / "Continue with Apple" buttons to Login + Signup pages
- [ ] Wire `supabase.auth.signInWithOAuth()` for each provider
- [ ] Ensure `users` table trigger handles OAuth sign-ups (name from provider metadata)
- [ ] Test account linking (email/password + OAuth same email)

**Milestone:** Users can sign up and log in with Google or Apple in addition to email/password.

**Validation:**
1. Go to `/login` → "Continue with Google" button visible
2. Click it → redirected to Google OAuth consent screen → authorize → redirected back, logged in
3. Check Supabase: `auth.users` row created with Google provider, `users` table row created via trigger with name from Google profile
4. Log out → log back in with Google → same account, no duplicate
5. Create account with email/password using the same email as your Google account → test account linking behaviour (should merge or show clear error depending on Supabase config)
6. Repeat steps 2–4 with Apple Sign-In
7. Log in with Google on mobile (iOS Safari, Android Chrome) → verify redirect flow works on mobile browsers
