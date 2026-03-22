// Date/time helpers — use date-fns for date math

// Pricing: walker sets net price, client pays gross (covers OSDS fee + Stripe fee)
const OSDS_FEE_RATE = 0.05 // 5%
const STRIPE_PERCENT_RATE = 0.034 // worst-case: 2.9% + 0.5% cross-border = 3.4%
const STRIPE_FIXED_PENCE = 20 // 20p per transaction
const COMBINED_RATE = OSDS_FEE_RATE + STRIPE_PERCENT_RATE // 8.4%

/** Gross up a walker's net price (cents) to the client-facing price */
export function clientPriceCents(netCents) {
  return Math.ceil((netCents + STRIPE_FIXED_PENCE) / (1 - COMBINED_RATE))
}

/** Calculate the platform fee (OSDS + Stripe) from a net price */
export function platformFeeCents(netCents) {
  return clientPriceCents(netCents) - netCents
}
