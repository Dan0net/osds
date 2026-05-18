export const OSDS_FEE_RATE = 0.05
export const STRIPE_PERCENT_RATE = 0.034
export const STRIPE_FIXED_PENCE = 20
export const COMBINED_RATE = OSDS_FEE_RATE + STRIPE_PERCENT_RATE

/** Gross up a walker's net price (cents) to the client-facing price. */
export function clientPriceCents(netCents) {
  return Math.ceil((netCents + STRIPE_FIXED_PENCE) / (1 - COMBINED_RATE))
}
