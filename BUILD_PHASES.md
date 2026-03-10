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
│   │   ├── public/        # Landing, WalkerPage, BookingFlow, Confirmation
│   │   ├── admin/         # Dashboard, Services, Availability, Bookings, CalendarSync
│   │   └── client/        # MyBookings
│   ├── lib/
│   │   ├── supabase.js    # Supabase client init
│   │   ├── api.js         # Fetch wrappers for Netlify Functions
│   │   ├── walker.js      # Resolve walker from subdomain or /w/:walker path
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

All pages built with hardcoded mock data for one walker (Ellie) and one client (Dan). No Supabase, Stripe, or function wiring. Mobile-responsive from the start.

- [ ] Subdomain + `/w/:walker` routing — hardcoded to resolve "ellie"
- [ ] Platform landing page at `onestopdog.shop` — value prop, how it works, dual sign-up CTAs ("I need someone to walk my dog!" / "I'm a dog walker")
- [ ] Walker landing page (`ellie.onestopdog.shop`) — Ellie's bio, services, mock reviews, "Book Now" CTA
- [ ] Client booking flow: select service → pick date → pick time slots → submit request → confirmation page (all navigable, nothing persists)
- [ ] Auth screens: sign-up / login for walker and client (forms only, no validation)
- [ ] Admin dashboard (mocked as Ellie):
  - [ ] Bookings list with mock requests from Dan — approve/decline buttons
  - [ ] Services CRUD form (pre-filled with Ellie's services)
  - [ ] Availability editor (day-of-week hours, blocked dates)
  - [ ] Calendar sync page (paste URL, copy feed URL)
  - [ ] Profile editor (pre-filled with Ellie's info)
- [ ] Client dashboard `/my-bookings` (mocked as Dan): mock bookings with various statuses (requested, confirmed, declined), favourites list
- [ ] Mobile-responsive across all pages (Tailwind breakpoints)

**Milestone:** Every user journey clickable end-to-end on desktop and mobile using Ellie (walker) and Dan (client). Platform landing → sign-up. Client browse → book → confirm. Admin approve/decline. My-bookings dashboard. All with mock data.

---

## Phase 3 — Auth + DB Foundation

- [ ] Supabase project: create all tables, RLS policies
- [ ] Supabase Auth for walker sign-up/login
- [ ] Supabase Auth for client sign-up/login
- [ ] Protected route guards (admin = walker auth, booking flow = client auth)
- [ ] Walker landing page resolves from DB (replace mock data)
- [ ] Walker profile editor wired to DB

**Milestone:** Real sign-up/login for both roles. Walker pages load from DB. Unauthenticated users redirected appropriately.

---

## Phase 4 — Booking Request Flow

- [ ] Services CRUD wired to DB
- [ ] Availability editor wired to DB (day-of-week hours, blocked dates)
- [ ] `get-availability` function — slot computation from availability + existing bookings
- [ ] `create-booking-request` — client submits request → status `requested`
- [ ] Admin bookings list: real data, `approve-booking` / `decline-booking` wired
- [ ] Capacity + `blocks_slot` logic in availability computation

**Milestone:** Client requests a booking → walker sees it in admin → approves or declines → status updates visible to both. Full request loop working end-to-end.

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

---

## Phase 6 — Calendar Sync

- [ ] Import: walker pastes iCal URL → `get-availability` subtracts external busy times
- [ ] Export: `calendar-feed` generates .ics feed per walker
- [ ] Cache external iCal fetches (short TTL)

**Milestone:** Walker's external calendar blocks availability. Bookings appear in walker's Google/Apple Calendar via subscription.

---

## Phase 7 — Notifications + Emails

- [ ] Resend integration: confirmation, approval, decline, cancellation, reschedule emails
- [ ] `save-push-subscription` + `send-push` functions
- [ ] Wire push triggers: new request → walker, approval/decline → client, payment → walker, cancellation → both, reminders → both
- [ ] iOS "Add to Home Screen" prompt for push support

**Milestone:** Both walkers and clients receive email and push notifications for all booking lifecycle events.

---

## Phase 8 — Reviews, Tipping, Favourites

- [ ] `submit-review` function + review display on walker page
- [ ] Tipping on confirmation page (tip added to payment via `tip_cents`)
- [ ] Favourite walkers list in client dashboard

**Milestone:** Clients can review completed bookings, tip, and save walkers to favourites. Reviews visible on walker pages.

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
