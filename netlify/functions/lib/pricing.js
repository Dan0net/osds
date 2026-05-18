export {
  OSDS_FEE_RATE,
  STRIPE_PERCENT_RATE,
  STRIPE_FIXED_PENCE,
  COMBINED_RATE,
  clientPriceCents,
} from '../../../shared/pricing.js'

export function slotNetCents(service, { petCount = 1, isHoliday = false, isOvernight = false, nights = 1 } = {}) {
  const base = isHoliday && service.holiday_rate_cents != null
    ? service.holiday_rate_cents
    : service.price_cents
  const extras = (service.extra_pet_rate_cents || 0) * Math.max(0, petCount - 1)
  const perSlot = base + extras
  return isOvernight && nights > 1 ? perSlot * nights : perSlot
}
