# User Journey Map

## J1: New Walker Signs Up

**Purpose:** Dog walker discovers OSDS and sets up their public booking page.

**User type:** Walker (new visitor)

**Current flow:**
1. Lands on `/` (PlatformLanding) — sees generic "Book trusted dog walkers" hero aimed at pet owners
2. Scrolls to "Are you a dog walker?" CTA at bottom → `/signup`
3. Creates account (email/password)
4. Redirected to `/account/dashboard` — no onboarding, no guided setup
5. Must self-discover they need to: go to Profile to create walker profile + slug, then Settings to add services + availability, then Payments to connect Stripe
6. Three separate pages, no indication of order or completeness

**Problems:**
- Landing page hero speaks to owners, not walkers — walkers don't feel targeted
- No walker-specific landing content or benefits explained
- Zero onboarding after signup — dropped into empty dashboard
- Setup split across 3 pages (Profile, Settings, Payments) with no checklist or progress
- No preview of their public page during setup
- No indication of what's incomplete or blocking them from receiving bookings

**Optimal journey:**
1. Landing page has clear split messaging or a dedicated walker section above the fold
2. Signup captures role intent ("I'm a walker" / "I'm a pet owner")
3. Post-signup onboarding wizard: business name/slug → add services → set availability → connect Stripe
4. Each step shows progress, skippable but flagged as incomplete
5. Dashboard shows setup checklist with completion % until fully live
6. Preview link to their public page shown throughout

---

## J2: New Owner Finds a Local Walker

**Purpose:** Pet owner needs a dog walker and wants to find one nearby.

**User type:** Owner (new visitor)

**Current flow:**
1. Lands on `/` — sees "Book trusted dog walkers in your area"
2. Featured walkers grid shown (currently mock data)
3. No search, no filters, no location input
4. Only way to reach a walker is: know their URL (`slug.onestopdog.shop`) or click a card in the grid
5. No way to browse by location, service type, price, rating, or availability

**Problems:**
- "In your area" is a lie — there's no location awareness at all
- No search or discovery mechanism
- No directory/listing page
- Featured walkers are mock data, not real
- Owner has no way to compare walkers (price, availability, reviews)
- If they don't find a walker here, there's nowhere else to go

**Optimal journey:**
1. Landing page prompts location (postcode/town) or uses browser geolocation
2. Results page shows walkers sorted by proximity with filters (service type, price range, rating, availability)
3. Walker cards show key info: services, price range, next available slot, rating, distance
4. Click through to walker's full profile page to book
5. Save/favourite walkers for quick access later

---

## J3: Owner Books a Walker for the First Time

**Purpose:** Owner has found a walker's page and wants to book a service.

**User type:** Owner (may or may not have account)

**Current flow:**
1. On walker page (`/w/:slug`) — sees services, availability calendar, reviews
2. Selects date → sees available time slots → selects service
3. Clicks "Book Now" → redirected to `/login` or `/signup` if not authenticated
4. After auth, must navigate back to walker page and re-select everything
5. Selects pet (or adds one first via `/account/pets`, then comes back)
6. Submits booking request → `/confirmation` — "Request submitted, wait for approval"
7. Waits for email/push notification that walker approved
8. Notification links to `/account/bookings` (all bookings page, not this specific one)
9. Must find the right booking in the list, click "Pay Now"
10. Stripe Checkout → back to `/confirmation` — "Payment successful"

**Problems:**
- Auth redirect loses booking context — user must start over
- No way to add a pet inline during booking flow
- Confirmation page is generic, no next-step guidance
- Approval notification links to all bookings, not the specific one needing payment
- No deep link to pay for a specific booking from notification
- Multiple page loads and context switches between booking → auth → pets → booking → pay
- No estimated response time shown

**Optimal journey:**
1. Select service + date + time on walker page
2. If not logged in, auth modal/slide-in preserves booking state
3. Pet selection inline (with quick-add option)
4. Submit → clear confirmation with "What happens next" steps
5. Approval notification deep-links to that specific booking with "Pay Now" prominent
6. One-tap payment → confirmation with booking details + calendar add

---

## J4: Owner Rebooks the Same Walker

**Purpose:** Returning owner wants to book the same walker again for a regular walk.

**User type:** Owner (existing account, returning)

**Current flow:**
1. Log in → `/account/dashboard`
2. Dashboard shows upcoming bookings but no "rebook" action
3. Must navigate to the walker's public page (no quick link from dashboard or past bookings)
4. Must manually find the walker URL or remember the subdomain
5. Go through entire booking flow again from scratch — select service, date, time, pet

**Problems:**
- No "Book again" or "Rebook" button on past/completed bookings
- No quick access to favourite/recent walkers from dashboard
- `favourite_walkers[]` field exists in DB but isn't used in UI
- No way to repeat a previous booking's service + pet combo
- Dashboard doesn't surface the walkers you use most
- Every rebooking is as much effort as the first booking

**Optimal journey:**
1. Dashboard shows "Your walkers" section with recent/favourite walkers
2. Past bookings have "Book again" button that pre-fills service + pet
3. One-tap rebook: same walker, same service, same pet → just pick date + time
4. Favourite walkers accessible from dashboard with direct book links

---

## J5: Walker Receives and Manages a Booking Request

**Purpose:** Walker reviews incoming requests and approves/declines them.

**User type:** Walker

**Current flow:**
1. Receives notification (email/push/inbox) — "New booking request from [name]"
2. Notification links to `/account/bookings` (full bookings page)
3. Must switch to "Incoming" tab
4. Find the specific request among potentially many
5. Review details (service, date, time, pet, client) → approve or decline
6. If approving multiple bookings in same payment group, must approve each or use batch button

**Problems:**
- Notification doesn't deep-link to the specific request
- Bookings page shows everything — no filtering by status (e.g. "pending requests only")
- No quick-action from notification (approve/decline without opening full page)
- No client info preview (past bookings with this client, notes)
- No indication of how the new booking fits with existing schedule

**Optimal journey:**
1. Notification deep-links to the specific booking request
2. Request view shows: client info, booking details, schedule context (what else is booked that day)
3. One-tap approve/decline from the notification or request detail view
4. After approval, confirmation shown with "Client has been notified to pay"

---

## J6: Owner Receives Approval and Pays

**Purpose:** Owner's booking was approved, they need to complete payment.

**User type:** Owner

**Current flow:**
1. Receives notification — "Booking approved! Ready to pay"
2. Notification link goes to `/account/bookings` (all bookings)
3. Must find the approved booking in the list
4. Click "Pay Now" → Stripe Checkout
5. After payment, redirected to `/confirmation`
6. No receipt shown inline, must go to `/account/payments` to find it

**Problems:**
- Notification links to all bookings, not the one needing payment
- Extra clicks to find and pay for the right booking
- No urgency indicator (checkout sessions expire in 30 min once created)
- Payment confirmation doesn't show receipt or booking summary
- Payments page lists all payments, no way to jump to specific one

**Optimal journey:**
1. Notification deep-links to booking detail with "Pay Now" button prominent
2. Or: notification contains direct Stripe checkout link (one tap to pay)
3. Post-payment confirmation shows full booking summary + receipt
4. "Add to calendar" button on confirmation

---

## J7: Walker Checks Earnings and Payouts

**Purpose:** Walker wants to see what they've earned and when payouts arrive.

**User type:** Walker

**Current flow:**
1. Navigate to `/account/payments`
2. See payment history table (date, amount, client, status)
3. Click "Stripe Dashboard" to open external Stripe Express dashboard for payout details
4. Two separate contexts — OSDS payments page and Stripe dashboard

**Problems:**
- No earnings summary (today/week/month totals)
- No payout schedule visibility without leaving to Stripe
- Payment list shows raw data, no aggregation or insights
- Dashboard doesn't surface earnings at a glance

**Optimal journey:**
1. Dashboard shows earnings widget (this week, this month, pending payout)
2. Payments page has summary cards at top + filterable transaction list
3. Payout info pulled from Stripe API shown inline (next payout date + amount)

---

## J8: Owner Manages Their Pets

**Purpose:** Owner adds/edits pet profiles used during booking.

**User type:** Owner

**Current flow:**
1. Navigate to `/account/pets`
2. Add pet form: name, breed, weight, age, notes
3. Edit/delete existing pets
4. Pet selection only surfaces during booking flow

**Problems:**
- No way to add a pet during booking (must leave flow, go to pets page, come back)
- Pet profiles are minimal (no photo, no medical notes, no vet info)
- No indication which pets have upcoming bookings

**Optimal journey:**
1. Pets manageable from dedicated page AND inline during booking
2. Quick-add pet modal in booking flow
3. Pet cards show upcoming bookings for that pet

---

## J9: Owner or Walker Views Notifications

**Purpose:** User checks their inbox for booking updates.

**User type:** Both

**Current flow:**
1. Navigate to `/account/inbox`
2. See chronological list of all notifications
3. Click notification → marked read + navigate to `link` (usually `/account/bookings`)
4. Separate page `/account/notifications` for toggling preferences

**Problems:**
- No unread badge/count in the header navigation
- All notification links go to `/account/bookings` — never to a specific booking
- No grouping or filtering (all types mixed together)
- Inbox and notification preferences are two separate menu items — confusing naming
- No way to act on a notification without navigating away

**Optimal journey:**
1. Unread count badge visible in header at all times
2. Notifications deep-link to the specific booking/payment
3. Quick-action buttons inline (e.g. "Approve" directly from notification)
4. Preferences accessible as a tab within inbox, not a separate page

---

## J10: Walker Sets Up Their Public Page

**Purpose:** Walker configures services, availability, and profile to start receiving bookings.

**User type:** Walker (setup phase)

**Current flow:**
1. Profile page (`/account/profile`): set business name, bio, slug, theme colour
2. Settings page (`/account/settings`): add services, set weekly availability, block dates, import calendars
3. Payments page (`/account/payments`): connect Stripe Express account
4. No way to preview public page from any of these

**Problems:**
- Setup scattered across 3 different pages
- No indication of what's missing or incomplete
- No live preview of public page
- Services and availability on same "Settings" page — overloaded
- No validation that walker is "ready to receive bookings" (has services + availability + Stripe)

**Optimal journey:**
1. Setup wizard (see J1) or dashboard checklist showing: profile, services, availability, Stripe status
2. Each section shows completion state
3. Live preview link always visible
4. Clear "You're live!" / "Not yet live" indicator

---

## J11: Owner Cancels or Reschedules

**Purpose:** Owner needs to change or cancel an upcoming booking.

**User type:** Owner

**Current flow:**
1. Navigate to `/account/bookings`
2. Find the booking
3. Cancel button available (triggers refund if paid)
4. Cannot reschedule — only walker can reschedule
5. Must cancel and rebook manually if they need a different time

**Problems:**
- Owner can't request a reschedule
- Cancel + rebook is high friction (loses confirmed slot, re-enters approval flow)
- No cancellation policy visibility before cancelling
- No distinction between cancellation windows (e.g. 24h+ vs last-minute)

**Optimal journey:**
1. Owner can request reschedule (walker approves new time)
2. Clear cancellation policy shown before confirming
3. Quick rebook option after cancellation

---

## J12: Visitor Browses a Walker's Public Page

**Purpose:** Someone (shared link, social media, search) views a walker's page to evaluate them.

**User type:** Visitor (unauthenticated)

**Current flow:**
1. Navigate to `slug.onestopdog.shop` or `/w/:slug`
2. See: hero (name, bio), services grid (with client markup prices), availability calendar, reviews
3. Can browse services and check availability without account
4. "Book Now" requires auth

**Problems:**
- No social proof summary (total reviews, average rating) at top
- No gallery/photos of the walker or dogs
- No service descriptions (just name + price + duration)
- No FAQ or cancellation policy
- Reviews section has no pagination or filtering

**Optimal journey:**
1. Strong social proof at top (rating, review count, "X walks completed")
2. Photo gallery
3. Service descriptions with what's included
4. Clear pricing breakdown (what client pays vs walker's rate)
5. Prominent availability with "Next available: [date]" shortcut
6. Reviews with filtering (recent, highest, lowest)

---

## Summary: Key Improvements Needed

| Priority | Area | Impacts |
|----------|------|---------|
| **P0** | Deep-link notifications to specific bookings/payments | J3, J5, J6, J9 |
| **P0** | Walker discovery (search, location, filters) | J2 |
| **P0** | Auth flow preserves booking context | J3 |
| **P1** | "Book again" / rebook shortcut | J4 |
| **P1** | Walker onboarding wizard + setup checklist | J1, J10 |
| **P1** | Unread notification badge in header | J9 |
| **P1** | Landing page split messaging (owner vs walker) | J1, J2 |
| **P1** | Inline pet add during booking | J3, J8 |
| **P2** | Dashboard with recent walkers, earnings, upcoming bookings | J4, J7 |
| **P2** | Owner reschedule requests | J11 |
| **P2** | Walker public page enhancements (gallery, descriptions, social proof) | J12 |
| **P2** | Payments page earnings summary | J7 |
| **P3** | Quick-action from notifications (approve inline) | J5, J9 |
| **P3** | Booking detail page (single booking view) | J3, J5, J6 |
