export const OSDS_FEE_RATE = 0.05
export const STRIPE_PERCENT_RATE = 0.034
export const STRIPE_FIXED_PENCE = 20
export const COMBINED_RATE = OSDS_FEE_RATE + STRIPE_PERCENT_RATE

export function grossUp(netCents) {
  return Math.ceil((netCents + STRIPE_FIXED_PENCE) / (1 - COMBINED_RATE))
}

export function slotNetCents(service, { petCount = 1, isHoliday = false, isOvernight = false, nights = 1 } = {}) {
  const base = isHoliday && service.holiday_rate_cents != null
    ? service.holiday_rate_cents
    : service.price_cents
  const extras = (service.extra_pet_rate_cents || 0) * Math.max(0, petCount - 1)
  const perSlot = base + extras
  return isOvernight && nights > 1 ? perSlot * nights : perSlot
}
