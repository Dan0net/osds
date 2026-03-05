# One Stop Dog Shop (OSDS)

Multi-tenant dog walking & services booking platform. Walkers get their own branded pages, manage services/availability, and accept payments. Clients book and pay without creating an account.

## Stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React + Vite + Tailwind | Free |
| Hosting | Netlify (static + serverless functions) | Free |
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

## Routing

```
/                        → Default walker (Ellie) landing page
/book                    → Default walker booking flow
/s/:slug                 → Walker landing page
/s/:slug/book            → Walker booking flow
/s/:slug/confirmation    → Post-payment confirmation
/my-bookings             → Client booking lookup (magic link via email)
/admin                   → Walker dashboard (email/password auth)
/cal/:walker_id/:token.ics  → iCal feed of walker's bookings
```

## Schema

```
walkers           slug, business_name, bio, stripe_account_id, theme_color, is_default, ical_url, calendar_feed_token
services          walker_id, name, price_cents, duration_minutes, active
availability      walker_id, day_of_week, start_time, end_time
blocked_dates     walker_id, date, reason
clients           name, email, phone (shared across walkers)
payments          walker_id, client_id, stripe_session_id, total_cents, status, source, receipt_url, created_at
bookings          walker_id, client_id, payment_id (nullable), booking_date, start_time, end_time, status
booking_items     booking_id, service_id, pet_name, pet_details
```

**Statuses:**
- `payment.status`: `paid` · `refunded` · `partially_refunded`
- `payment.source`: `stripe` · `cash`
- `booking.status`: `hold` · `confirmed` · `pending` · `cancelled` · `refunded`

### Payment Model

Clients or walkers create bookings. Both paths produce the same data:

**Client books online** → selects services/dates → Stripe Checkout → paid upfront.

**Walker books from admin** → picks client + services/dates → chooses:
- **Mark as paid** (cash, bank transfer) → `source = 'cash'`, bookings `confirmed`
- **Send payment link** → bookings `pending`, Checkout link emailed to client

```
payment ($145.00, paid, source: stripe)
  ├── booking (Walk, Mon Mar 2) — confirmed
  ├── booking (Walk, Wed Mar 4) — confirmed
  └── booking (Bath, Fri Mar 6) — confirmed

payment ($35.00, paid, source: cash)
  └── booking (Walk, Thu Mar 5) — confirmed

no payment yet (link sent)
  └── booking (Walk, Fri Mar 13) — pending
```

**Admin actions on bookings:**
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
| `get-availability` | GET | Compute open slots for a walker/date |
| `create-checkout` | POST | Create Stripe Checkout session with line items |
| `admin-create-booking` | POST | Walker creates booking on behalf of client |
| `stripe-webhook` | POST | Handle `checkout.session.completed` |
| `stripe-connect-onboard` | POST | Start Stripe Connect Express onboarding |
| `stripe-connect-callback` | GET | Handle Stripe OAuth redirect |
| `stripe-dashboard-link` | POST | Generate link to walker's Stripe Express Dashboard |
| `send-confirmation` | POST | Send booking confirmation emails |
| `send-magic-link` | POST | Send /my-bookings magic link |
| `verify-magic-link` | POST | Validate magic link token, return bookings |
| `cancel-booking` | POST | Cancel booking, refund if paid, notify |
| `reschedule-booking` | POST | Update booking date/time, notify client |
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
7. Page is live             → /s/:slug shows branded landing page
```

## Client Booking Flow

```
1. Visit /:slug (or / for default walker)
   → See services, bio, reviews

2. "Book Now" → /:slug/book
   a. Select service(s) + pet name/details
   b. Pick date(s) → see available time slots
   c. Pick time slot(s) — can add multiple to cart
   d. Enter name, email, phone

3. Checkout → Stripe Checkout (one line item per booking)
   → Hold bookings created → client pays → holds promoted to confirmed
   → If session expires, holds released
   → Confirmation emails sent

4. /confirmation → booking details + .ics download

5. /my-bookings → enter email → magic link → view/cancel bookings
```

## Auth

| Who | Method | Scope |
|---|---|---|
| Walker | Email + password (Supabase Auth) | Own data only (RLS by walker_id) |
| Client | Magic link to email (no account) | Own bookings by verified email |

## Design Decisions

- **No deferred invoicing** — pay at booking time. `payments` table groups multi-booking checkouts automatically.
- **No client accounts** — magic link verifies email for /my-bookings. Stripe Link auto-fills payment details for returning clients.
- **No OAuth for calendars** — iCal import/export covers 90% of needs. OAuth-based sync is a v2 upgrade if needed.
- **Stripe handles payment UI** — hosted Checkout, no PCI concerns.
- **No booking modifications** — reschedule date/time only. To change service: cancel + rebook.

## Security

| Concern | Mitigation |
|---|---|
| Calendar feed exposure | Secret token in URL, event titles omit client names |
| Magic link forgery | Token validated server-side; signing secret never in frontend |
| Fake webhooks | Stripe signature verified via `constructEvent()` |
| Unauthenticated admin actions | All admin functions verify Supabase JWT + walker ownership |
| Email enumeration | `send-magic-link` always returns same response; rate-limited per email + IP |
| Open email relay | `send-confirmation` only sends to emails tied to existing bookings |
| Cross-walker data leak | RLS on `clients` via join: walker sees only clients with their bookings |
| Price manipulation | Prices looked up server-side from `services` table |
| Double-booking | Hold bookings created atomically at checkout; released on expiry |
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
