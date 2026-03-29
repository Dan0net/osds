# User Journey Improvements

## Priority Matrix

| ID | Problem | Fix | Key Files | Status |
|----|---------|-----|-----------|--------|
| **P0-1** | No walker search/discovery — owners can't find walkers by location | Postcode search + proximity sort on landing page | `PlatformLanding.jsx`, `search-walkers.js`, `AccountProfile.jsx` | Pending |
| **P0-2** | Auth redirect loses booking context — user must re-select everything | Save booking intent to localStorage, restore after login | `AvailabilityCalendar.jsx`, `Login.jsx`, `BookingFlow.jsx` | Pending |
| **P0-3** | Notifications link to generic `/account/bookings`, not specific booking | Create BookingDetail page, deep-link all notifications | `BookingDetail.jsx`, all Netlify notify functions | Pending |
| **P1-1** | No walker onboarding — setup split across 3 pages with no guidance | Dashboard setup checklist with completion %, progress indicators | `AccountDashboard.jsx` | Pending |
| **P1-2** | No "Book again" — every rebooking is full effort | Favourite walkers section on dashboard, "Book again" on past bookings | `AccountDashboard.jsx`, `WalkerPage.jsx` | Pending |
| **P1-3** | Nav shows all 8 items regardless of role — confusing for pure clients | Filter nav by role, merge Inbox + Notifications | `AccountLayout.jsx`, `AccountInbox.jsx` | Pending |
| **P1-4** | Can't add pet during booking flow — must leave and come back | Inline pet quick-add form in BookingFlow | `BookingFlow.jsx` | Pending |
| **P1-5** | Calendars broken/oversized on mobile | Day view on mobile for BookingsCalendar, 3-day window for AvailabilityCalendar | `BookingsCalendar.jsx`, `AvailabilityCalendar.jsx` | Pending |
| **P2-1** | Dashboard mixes walker/owner concerns — clients see empty walker sections | Role-based dashboard sections with empty states | `AccountDashboard.jsx` | Pending |
| **P2-2** | Owner can't request reschedule — must cancel and rebook | Add reschedule request flow | `AccountBookings.jsx`, `reschedule-booking.js` | Pending |
| **P2-3** | Walker page lacks social proof, gallery, service descriptions | Rating summary, service descriptions, review filtering | `WalkerPage.jsx`, `AccountSettings.jsx` | Pending |
| **P2-4** | No earnings summary for walkers — just raw payment list | Earnings widget on dashboard, summary cards on payments page | `AccountDashboard.jsx`, `AccountPayments.jsx` | Pending |
| **P3-1** | Notification quick-actions (approve inline from notification) | Inline approve/decline buttons in inbox items | `AccountInbox.jsx` | Pending |
| **P3-2** | No single-booking detail view for deep-linking | Booking detail page at `/account/bookings/:id` | `BookingDetail.jsx` | Pending |

---

## P0: Critical

### Search & Discovery
- Add `postcode`, `lat`, `lng` to `walker_profiles` (migration done)
- Geocode via postcodes.io (free, no key) on profile save
- New `search-walkers.js` Netlify function: geocode input → Haversine sort → return nearest walkers
- Landing page: postcode input in hero, results grid replacing mock data, optional service type filter

**Acceptance criteria:**
- Owner enters postcode on landing page, sees walkers sorted by distance
- Walker cards show: name, rating, services summary, distance in miles
- No results message when no walkers nearby

### Auth Context Preservation
- AvailabilityCalendar: if not logged in, save `{walkerSlug, walkerId, slots}` to localStorage before redirecting to `/login?returnTo=...`
- Login/Signup: read `returnTo` param, navigate there after auth instead of hardcoded `/account`
- BookingFlow: restore slots from localStorage if `location.state` is empty
- Dashboard: show "Resume booking" banner if localStorage has unexpired intent

**Acceptance criteria:**
- Logged-out user selects slots → login → lands back on booking page with slots preserved
- Intent expires after 30 minutes

### Notification Deep-Links
- New `BookingDetail.jsx` component at `/account/bookings/:id`
- All Netlify notification functions update `link` to include booking ID
- Standardize `siteUrl` across all functions (some hardcode domain)

**Acceptance criteria:**
- Clicking notification in inbox navigates to specific booking detail
- Booking detail shows status, service, date/time, actions (Pay/Cancel)
- Old notifications with `/account/bookings` still work (list view)

---

## P1: High

### Walker Onboarding Checklist
- Dashboard shows setup progress: profile, services, availability, Stripe
- Each item links to relevant page with completion indicator
- "You're live!" / "Not yet live" status based on completeness

### Rebook / Favourite Walkers
- Wire up `favourite_walkers[]` DB field (exists, unused in UI)
- Heart icon on walker pages to toggle favourite
- Dashboard "Your Walkers" section with recent/favourite walkers + "Book again"

### Nav Filtering
- Hide "Settings" for non-walkers
- Merge "Inbox" and "Notifications" into single "Inbox" with tab for preferences
- Reduces nav from 8 → 6 items

### Inline Pet Add
- "Quick add pet" button in BookingFlow after pet selector
- Mini form: name + breed → insert to DB → refresh pet list

### Calendar Mobile Fix
- BookingsCalendar: add day view, default on mobile (<640px), remove `min-w-[640px]`
- AvailabilityCalendar: 3-day sliding window on mobile, arrows to navigate within week

---

## P2: Medium

### Dashboard Role Split
- Owner section: upcoming bookings, awaiting payments, favourite walkers, "Find a walker" CTA
- Walker section: pending requests, upcoming walks, revenue summary, setup checklist
- Hide empty sections, show helpful CTAs for new users

### Owner Reschedule Requests
- Owner can request new time (walker approves)
- Avoids cancel + rebook friction

### Walker Page Enhancements
- Rating/review count summary at top
- Service descriptions (new `description` column on services)
- Review pagination and filtering

### Earnings Summary
- Dashboard earnings widget (week/month totals)
- Payments page summary cards
