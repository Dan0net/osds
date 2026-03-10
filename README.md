# One Stop Dog Shop (OSDS)

Dog walking & services booking platform. Users sign up once and can book services for their pets, and optionally create a walker page at `<slug>.onestopdog.shop` to offer services and accept payments.

## Stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React + Vite + Tailwind (PWA) | Free |
| Hosting | Netlify (static + serverless functions, wildcard subdomain) | Free |
| Database + Auth | Supabase Postgres (cloud free tier) | Free |
| Payments | Stripe Connect (per-walker accounts) | 2.9%+30¢/txn |
| Email | Resend | Free (3K/mo) |

### Key Packages

| Package | Purpose |
|---|---|
| `stripe` | Connect onboarding, Checkout sessions, webhooks, refunds |
| `node-ical` | Parse external iCal feeds for calendar import |
| `ics` | Generate .ics feeds/files for calendar export |
| `jose` | Sign/verify JWTs for magic links |
| `date-fns` | Date math for slot computation |
| `@supabase/supabase-js` | Database queries, auth, RLS |
| `resend` | Transactional emails |
| `web-push` | VAPID-based push notifications |

## Routing

Wildcard DNS (`*.onestopdog.shop → Netlify`) — single deploy, walker resolved from `Host` header subdomain. Path fallback (`/w/:slug`) for local dev.

```
<slug>.onestopdog.shop     /  /book  /confirmation     → walker pages
onestopdog.shop            /w/:slug[/book|/confirmation] → same (path fallback)
onestopdog.shop            /                           → platform landing
                           /account                    → account (dashboard, profile, inbox, payments, settings, pets, bookings)
                           /cal/:walker_id/:token.ics  → iCal feed
```

## Schema

### Unified User Model

Single `users` table — every account can book services. Users who create a walker page get a row in `walker_profiles`.

```
users              id (Supabase Auth), name, email, phone, avatar_url, favourite_walkers[]
pets               user_id, name, breed, weight, age, notes
walker_profiles    user_id (1:1), slug, business_name, bio, stripe_account_id, theme_color, is_default, ical_url, calendar_feed_token
services           walker_id, name, price_cents, duration_minutes, active
availability       walker_id, day_of_week, start_time, end_time
blocked_dates      walker_id, date, reason
payments           walker_id, client_id, stripe_session_id, total_cents, tip_cents, status, source, receipt_url, created_at
bookings           walker_id, client_id, payment_id (nullable), booking_date, start_time, end_time, capacity, blocks_slot, status
booking_items      booking_id, service_id, pet_id, pet_details
reviews            walker_id, client_id, booking_id, rating, comment, created_at
push_subscriptions user_id, endpoint, keys, device_type, created_at
```

**Statuses:**
- `payment.status`: `paid` · `refunded` · `partially_refunded`
- `payment.source`: `stripe` · `cash`
- `booking.status`: `requested` · `approved` · `hold` · `confirmed` · `pending` · `cancelled` · `declined` · `refunded`
- `booking.capacity`: number of concurrent clients allowed in this slot (default `1`)
- `booking.blocks_slot`: `true` (default) blocks the time slot; `false` keeps slot open for others

### Payment Model

Clients or walkers create bookings. Client bookings require walker approval before payment.

**Client books online** → selects services/dates → bookings created as `requested` → walker notified → walker approves or declines → if approved, payment link emailed → client pays via Stripe Checkout → bookings `confirmed`.

**Walker books from account** → picks client + services/dates → chooses:
- **Mark as paid** (cash, bank transfer) → `source = 'cash'`, bookings `confirmed`
- **Send payment link** → bookings `pending`, Checkout link emailed

```
requested (awaiting walker approval)
  ├── booking (Walk, Mon Mar 2) — requested
  └── booking (Bath, Fri Mar 6) — requested

approved → payment link sent
  ├── booking (Walk, Mon Mar 2) — pending
  └── booking (Bath, Fri Mar 6) — pending

payment ($145.00, paid, source: stripe)
  ├── booking (Walk, Mon Mar 2) — confirmed
  └── booking (Bath, Fri Mar 6) — confirmed

payment ($35.00, paid, source: cash)
  └── booking (Walk, Thu Mar 5) — confirmed

declined by walker
  └── booking (Walk, Sat Mar 7) — declined
```

**Walker actions on bookings:**
- Approve or decline requested bookings
- Reschedule (change date/time only — to change service: cancel + rebook)
- Cancel / refund individual bookings or entire payments
- Resend payment links for pending bookings

### Calendar Sync

Two directions, no OAuth — iCal standard only:

**Import:** Walker pastes Google/Apple/Outlook iCal URL → `get-availability` fetches it and subtracts busy times from open slots.

**Export:** Walker copies subscribe URL → adds to Google/Apple Calendar → bookings appear automatically.

## Account Pages

All users get `/account` with these sections:

| Page | Purpose |
|---|---|
| Dashboard | Overview: upcoming bookings, recent activity, walker stats (if walker) |
| Profile | Edit name, email, phone, avatar. If walker: business name, bio, theme |
| Inbox | Messages and notifications |
| Payments | Payment history, Stripe Connect management (if walker) |
| Settings | Preferences, notification settings, calendar sync (if walker), availability (if walker) |
| Pets | Manage pets (name, breed, weight, notes) |
| Bookings | View/manage bookings as client; manage incoming requests as walker |

Walker-specific features appear conditionally when the user has a `walker_profiles` row. Any user can "Become a Walker" from their account to create one.

## Netlify Functions

All serverless functions live in `netlify/functions/`.

| Function | Method | Purpose |
|---|---|---|
| `get-availability` | GET | Compute open slots for a walker/date (respects capacity and blocks_slot) |
| `create-booking-request` | POST | User submits booking request (status: requested) |
| `approve-booking` | POST | Walker approves request → sends payment link |
| `decline-booking` | POST | Walker declines request → notifies client |
| `create-checkout` | POST | Create Stripe Checkout session for approved bookings |
| `walker-create-booking` | POST | Walker creates booking on behalf of client (skips approval) |
| `stripe-webhook` | POST | Handle `checkout.session.completed` |
| `stripe-connect-onboard` | POST | Start Stripe Connect Express onboarding |
| `stripe-connect-callback` | GET | Handle Stripe OAuth redirect |
| `stripe-dashboard-link` | POST | Generate link to walker's Stripe Express Dashboard |
| `send-confirmation` | POST | Send booking confirmation emails |
| `cancel-booking` | POST | Cancel booking, refund if paid, notify |
| `reschedule-booking` | POST | Update booking date/time, notify client |
| `submit-review` | POST | Submit rating + comment for a completed booking |
| `send-push` | POST | Send push notification |
| `save-push-subscription` | POST | Store browser push subscription for a user |
| `calendar-feed` | GET | Generate iCal (.ics) feed for a walker |

## Walker Setup Flow

```
1. User clicks "Become a Walker"   → walker_profiles row created with slug
2. Fill profile                    → business_name, bio, photo, theme_color
3. Connect Stripe                  → Stripe Express hosted onboarding → redirected back
4. Add services                    → name, price, duration (CRUD)
5. Set availability                → weekly hours, blocked dates, (optional) paste iCal URL
6. Page is live                    → <slug>.onestopdog.shop
```

## Booking Flow

```
1. Visit <slug>.onestopdog.shop → see services, bio, reviews

2. "Book Now" → /book (must be logged in)
   a. Select service(s) + pick pet from saved pets
   b. Pick date(s) → see available time slots
   c. Pick time slot(s) — can add multiple to cart
   d. Submit request → bookings created as `requested`

3. Walker reviews in account → approves or declines
   → If approved: payment link emailed
   → If declined: client notified

4. Client clicks payment link → Stripe Checkout
   → Hold bookings created → pays → confirmed
   → If session expires, holds released

5. /confirmation → booking details + .ics download → option to review + tip

6. /account/bookings → view/cancel bookings, track status, manage favourites
```

## Auth

Single auth model — Supabase Auth (email/password). One account, one login. RLS scopes data by `user_id`. Walker data additionally scoped by walker ownership.

## Design Decisions

- **Unified user model** — one account can both book services and offer them. No separate walker/client accounts. Walker features activate when user creates a walker profile.
- **Walker approval before payment** — client bookings start as `requested`. Payment link sent only after approval. Walker-created bookings skip approval.
- **No deferred invoicing** — pay at approval time. `payments` table groups multi-booking checkouts automatically.
- **Class-style slots** — bookings have a `capacity` (default 1) and a `blocks_slot` toggle for group walks.
- **Tipping** — clients can add a tip post-booking; stored as `tip_cents` on the payment.
- **Reviews** — clients can leave a rating + comment after a completed booking.
- **No OAuth for calendars** — iCal import/export covers 90% of needs.
- **Stripe handles payment UI** — hosted Checkout, no PCI concerns.
- **PWA with push notifications** — install-to-home-screen + Web Push (VAPID).
- **Subdomain-per-walker** — wildcard DNS + single Netlify deploy. Walker resolved from `Host` header.
- **No booking modifications** — reschedule date/time only. To change service: cancel + rebook.

## Security

| Concern | Mitigation |
|---|---|
| Calendar feed exposure | Secret token in URL, event titles omit client names |
| Fake webhooks | Stripe signature verified via `constructEvent()` |
| Unauthenticated actions | All protected functions verify Supabase JWT + ownership |
| Auth enumeration | Sign-up/login always returns same response shape; rate-limited |
| Open email relay | `send-confirmation` only sends to emails tied to existing bookings |
| Subdomain spoofing | Walker looked up server-side from `Host` header; unknown subdomains return 404 |
| Cross-user data leak | RLS on all tables by user_id / walker ownership |
| Price manipulation | Prices looked up server-side from `services` table |
| Unapproved payment | Checkout session only created for `approved` bookings; status checked server-side |
| Double-booking | Hold bookings created atomically; capacity + blocks_slot checked server-side |
| iCal SSRF | URL validated: HTTPS only, private IP ranges rejected |

## Future

- **Platform subscription** — charge walkers a monthly fee via Stripe Subscription. Gate "Go Live" behind active subscription.
- **OAuth calendar sync** — real-time read/write sync with Google/Outlook APIs if iCal polling proves too slow.

## Local Development

```bash
git clone <repo> && cd osds && npm install
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY,
#          STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
npx netlify dev    # Starts Vite + Functions on localhost:8888
```
