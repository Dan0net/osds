import { slotNetCents, clientPriceCents } from './pricing.js'

const INACTIVE_STATUSES = '(cancelled,declined,refunded)'

export async function recomputePaymentTotals(adminSupabase, paymentId) {
  const { data: active } = await adminSupabase
    .from('bookings')
    .select('id, is_holiday, pet_ids, booking_date, end_date, services(price_cents, holiday_rate_cents, extra_pet_rate_cents, blocks_slot)')
    .eq('payment_id', paymentId)
    .not('status', 'in', INACTIVE_STATUSES)

  let netTotal = 0
  for (const b of (active || [])) {
    if (!b.services) continue
    const isOvernight = !!b.end_date && b.end_date !== b.booking_date
    const nights = isOvernight
      ? Math.round((new Date(b.end_date) - new Date(b.booking_date)) / (1000 * 60 * 60 * 24))
      : 1
    const petCount = Array.isArray(b.pet_ids) && b.pet_ids.length > 0 ? b.pet_ids.length : 1
    netTotal += slotNetCents(b.services, {
      petCount,
      isHoliday: !!b.is_holiday,
      isOvernight,
      nights,
    })
  }
  const grossTotal = clientPriceCents(netTotal)
  return {
    total_cents: grossTotal,
    platform_fee_cents: grossTotal - netTotal,
    active_count: active?.length || 0,
  }
}
