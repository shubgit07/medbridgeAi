/**
 * Composite urgency score for ranking near-expiry listings.
 * Higher score = should be matched & notified first.
 * 
 * Components:
 * - expiry_weight: Non-linear urgency; spikes below 30 days (exp(-0.02 * days))
 * - distance_weight: Inverse distance; hyperlocal bias (1 / (1 + distance_km))
 * - demand_signal: Normalized demand for drug in locality (0.0 to 1.0)
 * - seller_trust_score: Seller reliability (0.0 to 1.0)
 */
export function computeUrgencyScore(
  daysToExpiry: number,
  distanceKm: number,
  demandSignal: number = 0.5,
  sellerTrustScore: number = 0.5
): number {
  const expiryWeight = Math.exp(-0.02 * daysToExpiry);
  const distanceWeight = 1 / (1 + Math.max(0, distanceKm));

  const score =
    0.40 * expiryWeight +
    0.25 * distanceWeight +
    0.25 * Math.min(1, Math.max(0, demandSignal)) +
    0.10 * Math.min(1, Math.max(0, sellerTrustScore));

  return Number(score.toFixed(4));
}
