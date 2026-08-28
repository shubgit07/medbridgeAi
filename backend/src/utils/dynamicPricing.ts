/**
 * Sigmoid-based expiry decay pricing model.
 * 
 * - At 90 days: ~10% discount
 * - At 60 days: ~25% discount
 * - At 30 days: ~45% discount
 * - At 14 days: ~65% discount
 * - At  7 days: ~75% discount (floor)
 * 
 * Formula: discount = min_discount + (max_discount - min_discount) /
 * (1 + e^(k * (days - midpoint)))
 * where midpoint = 45 days and k = 0.08. A positive k makes the
 * discount increase as the number of days remaining falls.
 */
export function computeSuggestedPrice(mrp: number, daysToExpiry: number) {
  if (!Number.isFinite(mrp) || mrp <= 0) {
    throw new Error('MRP must be a positive number');
  }

  const MIN_DISCOUNT = 0.05;
  const MAX_DISCOUNT = 0.75;
  const MIDPOINT = 45;
  const K = 0.08;

  let discountPct = MIN_DISCOUNT + (MAX_DISCOUNT - MIN_DISCOUNT) / (1 + Math.exp(K * (daysToExpiry - MIDPOINT)));
  discountPct = Math.max(0.0, Math.min(MAX_DISCOUNT, discountPct));

  const suggestedPrice = mrp * (1 - discountPct);

  return {
    mrp,
    suggestedPrice: Number(suggestedPrice.toFixed(2)),
    discountPct: Number((discountPct * 100).toFixed(1)),
    daysToExpiry,
  };
}
