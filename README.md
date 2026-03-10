# One Stop Dog Shop (OSDS)

Multi-tenant dog walking & services booking platform. Walkers get their own subdomain at `<walker>.onestopdog.shop`, manage services/availability, and accept payments. Clients create accounts to book, save preferred sitters, and leave reviews.

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

Wildcard DNS (`*.onestopdog.shop → Netlify`) — single deploy, walker resolved from `Host` header subdomain. Path fallback (`/w/:walker`) for local dev.

```
<walker>.onestopdog.shop   /  /book  /confirmation     → walker pages
onestopdog.shop            /w/:walker[/book|/confirmation] → same (path fallback)
onestopdog.shop            /                           → platform landing
                           /my-bookings                → client dashboard
                           /admin                      → walker dashboard
                           /cal/:walker_id/:token.ics  → iCal feed
```

## Schema

```
walkers           walker, business_name, bio, stripe_account_id, theme_color, is_default, ical_url, calendar_feed_token
services          walker_id, name, price_cents, duration_minutes, active
availability      walker_id, day_of_week, start_time, end_time
blocked_dates     walker_id, date, reason
clients           user_id (Supabase Auth), name, email, phone, favourite_walkers[]
payments          walker_id, client_id, stripe_session_id, total_cents, tip_cents, status, source, receipt_url, created_at
bookings          walker_id, client_id, payment_id (nullable), booking_date, start_time, end_time, capacity, blocks_slot, status
booking_items     booking_id, service_id, pet_name, pet_details
reviews           walker_id, client_id, booking_id, rating, comment, created_at
push_subscriptions  user_id, endpoint, keys, device_type, created_at
```

**Statuses:**
- `payment.status`: `paid` · `refunded` · `partially_refunded`
- `payment.source`: `stripe` · `cash`
- `booking.status`: `requested` · `approved` · `hold` · `confirmed` · `pending` · `cancelled` · `declined` · `refunded`
- `booking.capacity`: number of concurrent clients allowed in this slot (default `1`, admin can increase for class-style bookings)
- `booking.blocks_slot`: `true` (default) blocks the time slot from further bookings; `false` keeps the slot open for others

### Payment Model

Clients or walkers create bookings. Client bookings require walker approval before payment.

**Client books online** → selects services/dates → bookings created as `requested` → walker notified → walker approves or declines → if approved, payment link emailed to client → client pays via Stripe Checkout → bookings `confirmed`.

**Walker books from admin** → picks client + services/dates → chooses:
- **Mark as paid** (cash, bank transfer) → `source = 'cash'`, bookings `confirmed` (no approval needed — walker is creating it)
- **Send payment link** → bookings `pending`, Checkout link emailed to client (no approval needed)

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

**Admin actions on bookings:**
- Approve or decline requested bookings
- Reschedule (change date/time, same service — to change service: cancel + rebook)
- Cancel / refund individual bookings or entire payments
- Resend payment links for pending bookings

Partial refund on a multi-booking payment → payment becomes `partially_refunded`.

### Calendar Sync

Two directions, no OAuth — iCal standard only:

**Import:** Walker pastes Google/Apple/Outlook iCal URL in admin → `get-availability` fetches it and subtracts busy times from open slots.

**Export:** Walker copies subscribe URL from admin → adds to Google/Apple Calendar → bookings appear automatically.

## Netlify Functions

All serverless functions live in `netlify/functions/`.

| Function | Method | Purpose |
|---|---|---|
| `get-availability` | GET | Compute open slots for a walker/date (respects capacity and blocks_slot) |
| `create-booking-request` | POST | Client submits booking request (status: requested) |
| `approve-booking` | POST | Walker approves request → sends payment link to client |
| `decline-booking` | POST | Walker declines request → notifies client |
| `create-checkout` | POST | Create Stripe Checkout session for approved bookings |
| `admin-create-booking` | POST | Walker creates booking on behalf of client (skips approval) |
| `stripe-webhook` | POST | Handle `checkout.session.completed` |
| `stripe-connect-onboard` | POST | Start Stripe Connect Express onboarding |
| `stripe-connect-callback` | GET | Handle Stripe OAuth redirect |
| `stripe-dashboard-link` | POST | Generate link to walker's Stripe Express Dashboard |
| `send-confirmation` | POST | Send booking confirmation emails |
| `send-magic-link` | POST | Send /my-bookings magic link |
| `verify-magic-link` | POST | Validate magic link token, return bookings |
| `cancel-booking` | POST | Cancel booking, refund if paid, notify |
| `reschedule-booking` | POST | Update booking date/time, notify client |
| `submit-review` | POST | Client submits rating + comment for a completed booking |
| `send-push` | POST | Send push notification to walker or client |
| `save-push-subscription` | POST | Store browser push subscription for a user |
| `calendar-feed` | GET | Generate iCal (.ics) feed for a walker |

## Walker Onboarding

```
1. Sign up                  → Supabase Auth (email/password) → walkers row created
2. Fill profile             → business_name, bio, photo, theme_color
3. Connect Stripe           → "Connect Stripe" button → Stripe Express hosted onboarding
                              → bank details + identity verification → redirected back
4. Add services             → name, price, duration (CRUD)
5. Set availability         → weekly hours, blocked dates, (optional) paste iCal URL
6. Subscribe to bookings    → copy .ics feed URL → add to Google/Apple Calendar
7. Page is live             → <walker>.onestopdog.shop shows branded landing page
```

## Client Booking Flow

```
1. Visit <walker>.onestopdog.shop (or onestopdog.shop for default walker)
   → See services, bio, reviews

2. "Book Now" → <walker>.onestopdog.shop/book (must be logged in)
   a. Select service(s) + pet name/details
   b. Pick date(s) → see available time slots
   c. Pick time slot(s) — can add multiple to cart
   d. Submit request → bookings created as `requested`

3. Walker reviews request in admin → approves or declines
   → If approved: payment link emailed to client
   → If declined: client notified, bookings marked `declined`

4. Client clicks payment link → Stripe Checkout
   → Hold bookings created → client pays → holds promoted to confirmed
   → If session expires, holds released
   → Confirmation emails sent

5. /confirmation → booking details + .ics download
   → Option to leave a review and tip

6. /my-bookings → logged-in client dashboard → view/cancel bookings, track request status, manage favourites
```

## Auth

| Who | Method | Scope |
|---|---|---|
| Walker | Email + password (Supabase Auth) | Own data only (RLS by walker_id) |
| Client | Email + password (Supabase Auth) | Own bookings, favourites, reviews (RLS by client user_id) |

## Design Decisions

- **Walker approval before payment** — client bookings start as `requested`. Walker approves or declines from admin. Payment link sent only after approval. Walker-created bookings skip approval.
- **No deferred invoicing** — pay at approval time. `payments` table groups multi-booking checkouts automatically.
- **Client accounts required** — Supabase Auth for clients enables favourites, reviews, and booking history.
- **Class-style slots** — bookings have a `capacity` (default 1) and a `blocks_slot` toggle. Walker can increase capacity for group walks or set `blocks_slot = false` to keep the time open for other bookings.
- **Tipping** — clients can add a tip post-booking; stored as `tip_cents` on the payment.
- **Reviews** — clients can leave a rating + comment after a completed booking.
- **No OAuth for calendars** — iCal import/export covers 90% of needs. OAuth-based sync is a v2 upgrade if needed.
- **Stripe handles payment UI** — hosted Checkout, no PCI concerns.
- **PWA with push notifications** — `manifest.json` + service worker enables install-to-home-screen and Web Push (VAPID). Works on Android browsers natively; iOS requires "Add to Home Screen" first. Push sent on: new request (→ walker), approval/decline (→ client), payment received (→ walker), cancellation (→ both), upcoming reminders (→ both).
- **Subdomain-per-walker** — wildcard DNS (`*.onestopdog.shop`) + single Netlify deploy. Walker resolved from `Host` header. No per-walker infrastructure.
- **No booking modifications** — reschedule date/time only. To change service: cancel + rebook.

## Security

| Concern | Mitigation |
|---|---|
| Calendar feed exposure | Secret token in URL, event titles omit client names |
| Magic link forgery | Token validated server-side; signing secret never in frontend |
| Fake webhooks | Stripe signature verified via `constructEvent()` |
| Unauthenticated admin actions | All admin functions verify Supabase JWT + walker ownership |
| Auth enumeration | Sign-up/login always returns same response shape; rate-limited per email + IP |
| Open email relay | `send-confirmation` only sends to emails tied to existing bookings |
| Subdomain spoofing | Walker looked up server-side from `Host` header; unknown subdomains return 404 |
| Cross-walker data leak | RLS on `clients` via join: walker sees only clients with their bookings |
| Price manipulation | Prices looked up server-side from `services` table |
| Unapproved payment | Checkout session only created for `approved` bookings; status checked server-side |
| Double-booking | Hold bookings created atomically at checkout; released on expiry. Capacity and blocks_slot checked server-side. Requested bookings do not block slots until approved |
| iCal SSRF | URL validated: HTTPS only, private IP ranges rejected |

## Future

- **Platform subscription** — charge walkers a flat monthly fee via Stripe Subscription on our account (separate from Connect booking payments). Add `subscription_status` to `walkers`, gate "Go Live" behind active subscription. Manage via Stripe Customer Portal (zero custom billing UI).
- **OAuth calendar sync** — real-time read/write sync with Google/Outlook APIs if iCal polling proves too slow.

## Local Development

```bash
git clone <repo> && cd osds && npm install
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY,
#          STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
npx netlify dev    # Starts Vite + Functions on localhost:8888
```
