# OSDS — Claude Instructions

See `README.md` for project overview, schema, stack, and flows. See `BUILD_PHASES.md` for implementation roadmap.

**Principles:** KISS (simplest solution that works), DRY (extract only when repeated 3+ times), SOLID (single responsibility, depend on abstractions).

## Conventions

- Tailwind for all styling — no CSS files, no CSS-in-JS
- Mobile-first responsive design
- React functional components + hooks only
- Custom hooks for data fetching, context providers for cross-cutting concerns
- `lib/` for pure utilities, `date-fns` for date math
- One function per Netlify function file
- Functions return `{ data }` or `{ error }` — consistent shapes
- Validate at system boundaries, trust internal code
- **Notifications go through the server push pipeline.** VAPID + service worker ([public/sw.js](public/sw.js)) + `push_subscriptions` table + [notify.js](netlify/functions/lib/notify.js) (`sendPushToUser`, `sendEmail`, `notifyChatMessage`, `notify`) + per-user prefs on `users.notification_preferences`. Never use client-side `new Notification()` — it's flaky in non-PWA browser tabs. New event types: add a key to `PREF_MAP`, a row to `PREF_ITEMS` in [AccountNotifications.jsx](src/pages/account/AccountNotifications.jsx), and a default in `DEFAULT_PREFS`.

## Security (non-negotiable)

- All admin functions verify Supabase JWT + walker ownership
- RLS on every table — never bypass
- Stripe webhook signature verified via `constructEvent()`
- iCal import: HTTPS only, reject private IP ranges
- Prices resolved server-side — never trust client
- Hold bookings created atomically; capacity + `blocks_slot` checked server-side
