export { clientPriceCents } from '../../shared/pricing'
import { clientPriceCents } from '../../shared/pricing'

/** Platform fee (OSDS + Stripe) from a net price. */
export function platformFeeCents(netCents) {
  return clientPriceCents(netCents) - netCents
}

/** Walker's take from a payment after fees and any refunds.
 *  Refunded amount reduces take proportionally to the take:gross ratio. */
export function walkerTakeFromPayment(payment) {
  if (!payment) return 0
  const total = payment.total_cents || 0
  const fee = payment.platform_fee_cents || 0
  const refunded = payment.refunded_amount_cents || 0
  const grossTake = total - fee
  if (total <= 0) return 0
  const refundedTake = Math.round((refunded * grossTake) / total)
  return Math.max(0, grossTake - refundedTake)
}

/** Net amount the client paid for a payment after refunds. */
export function clientPaidAmount(payment) {
  if (!payment) return 0
  return Math.max(0, (payment.total_cents || 0) - (payment.refunded_amount_cents || 0))
}

/** Service price as displayed to the viewer (walker → net, owner → gross). */
export function displayServicePrice(svc, viewerIsWalker) {
  const net = svc?.price_cents || 0
  return viewerIsWalker ? net : clientPriceCents(net)
}

/** Payment amount as displayed to the viewer. Walker sees take; owner sees what they paid (net of refunds). */
export function displayPaymentAmount(payment, viewerIsWalker) {
  return viewerIsWalker ? walkerTakeFromPayment(payment) : clientPaidAmount(payment)
}
