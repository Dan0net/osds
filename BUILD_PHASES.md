# Build Phases

## Phase 1 — Scaffold

- [ ] `npm create vite@latest . -- --template react` + Tailwind setup
- [ ] `netlify.toml` with functions directory and redirects (SPA fallback)
- [ ] Supabase project: create tables, RLS policies, enable auth
- [ ] `.env.example` with all required keys
- [ ] Project structure:

```
osds/
├── src/
│   ├── components/        # Shared UI
│   ├── pages/
│   │   ├── public/        # LandingPage, BookingFlow, Confirmation
│   │   ├── admin/         # Dashboard, Services, Availability, Bookings, Payments, CalendarSync
│   │   └── client/        # MyBookings
│   ├── lib/
│   │   ├── supabase.js    # Supabase client init
│   │   ├── api.js         # Fetch wrappers for Netlify Functions
│   │   └── utils.js       # Date/time helpers, slot computation
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

## Phase 2 — Admin Dashboard

- [ ] Walker sign-up / login (Supabase Auth, email+password)
- [ ] Protected `/admin` routes
- [ ] Profile page: business name, bio, photo upload, theme color, slug
- [ ] Services CRUD: name, description, price, duration, active toggle
- [ ] Availability: set hours per day-of-week, block specific dates
- [ ] Calendar sync: paste external iCal URL, copy booking feed URL
- [ ] Stripe Connect onboarding → save `stripe_account_id`
- [ ] Stripe Express Dashboard link

## Phase 3 — Public Booking Flow

- [ ] `/:slug` and `/` landing page: walker info, service list, "Book Now" CTA
- [ ] Resolve walker by slug (or `is_default` flag for `/`)
- [ ] Booking wizard:
  1. Select service(s) + pet name/details
  2. Pick date(s) → fetch available slots
  3. Pick time slot(s) — multi-date/service cart
  4. Enter name, email, phone
  5. Review & confirm
- [ ] Slot computation: availability − blocked dates − existing bookings − external calendar busy times
- [ ] No public-side client auto-fill (security). Admin-only.

## Phase 4 — Payments

- [ ] `create-checkout`: Checkout session with line items, hold bookings to prevent double-booking
- [ ] `stripe-webhook`: promote holds → confirmed, create payment record, send confirmations
- [ ] `admin-create-booking`: walker creates booking (mark paid or send payment link)
- [ ] Admin Payments page: list + expand payments, refund single/all bookings
- [ ] Admin Bookings page: list bookings, "New Booking" button, reschedule, cancel
- [ ] Pending bookings: highlight, resend link, cancel

## Phase 5 — Calendar Sync

- [ ] `calendar-feed`: generate .ics feed per walker (generic event titles, no client names)
- [ ] Admin: "Copy feed URL" + "Paste iCal URL"
- [ ] `get-availability`: fetch + parse external iCal, subtract busy events
- [ ] Cache external iCal fetches (short TTL)

## Phase 6 — Emails

- [ ] Resend integration in `send-confirmation`
- [ ] Templates: booking confirmation, new booking (to walker), reschedule notice, cancellation
- [ ] All emails: booking details, service, date/time, amount

## Phase 7 — Client Booking Lookup

- [ ] `/my-bookings`: enter email → `send-magic-link` → magic link sent
- [ ] `verify-magic-link`: validate token server-side, return bookings
- [ ] View all bookings (upcoming + past), cancel upcoming

## Phase 8 — Polish & Deploy

- [ ] Mobile-responsive (Tailwind breakpoints)
- [ ] Loading states, error boundaries, empty states
- [ ] SEO: meta tags, Open Graph for walker pages
- [ ] Netlify deploy: connect repo, env vars, custom domain
- [ ] Smoke test: sign up walker → add service → book as client → pay → confirm
