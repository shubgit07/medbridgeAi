/**
 * Sigmoid-based expiry decay pricing model.
 * 
 * - At 90 days: ~10% discount
 * - At 60 days: ~25% discount
 * - At 30 days: ~45% discount
 * - At 14 days: ~65% discount
 * - At  7 days: ~75% discount (floor)
 * 
 * Formula: discount = max_discount / (1 + e^(k * (days - midpoint)))
 * where midpoint = 45 days, k = -0.08
 */
export function computeSuggestedPrice(mrp: number, daysToExpiry: number) {
  const MAX_DISCOUNT = 0.75;
  const MIDPOINT = 45;
  const K = -0.08;

  let discountPct = MAX_DISCOUNT / (1 + Math.exp(K * (daysToExpiry - MIDPOINT)));
  discountPct = Math.max(0.0, Math.min(MAX_DISCOUNT, discountPct));

  const suggestedPrice = mrp * (1 - discountPct);

  return {
    mrp,
    suggestedPrice: Number(suggestedPrice.toFixed(2)),
    discountPct: Number((discountPct * 100).toFixed(1)),
    daysToExpiry,
  };
}
