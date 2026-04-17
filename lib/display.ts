import type { DrawTierKey } from "@/lib/types";

export const drawTierLabels: Record<DrawTierKey, string> = {
  match5: "5-number match",
  match4: "4-number match",
  match3: "3-number match"
};

export function formatMoney(cents: number, currencyCode = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(cents / 100);
}

