import type { PromoCode } from "@prisma/client";

export function computeDiscountPence(
  basePricePence: number,
  promo: Pick<PromoCode, "percentOff" | "amountOffPence">,
): number {
  if (promo.percentOff != null && promo.percentOff > 0) {
    const pct = Math.min(100, Math.max(0, promo.percentOff));
    return Math.min(basePricePence, Math.floor((basePricePence * pct) / 100));
  }
  if (promo.amountOffPence != null && promo.amountOffPence > 0) {
    return Math.min(basePricePence, promo.amountOffPence);
  }
  return 0;
}

export function finalPricePence(basePricePence: number, discountPence: number): number {
  return Math.max(0, basePricePence - discountPence);
}
