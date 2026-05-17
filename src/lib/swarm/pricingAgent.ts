import { callWafer } from "@/lib/callWafer";
import type { ProductInput, MarketData, Pricing, Platform } from "./types";

const FEES: Record<Platform, { pct: number; label: string }> = {
  amazon:   { pct: 0.15,  label: "15% referral fee" },
  etsy:     { pct: 0.065, label: "6.5% transaction fee + $0.20 listing" },
  ebay:     { pct: 0.13,  label: "13% final value fee" },
  walmart:  { pct: 0.15,  label: "15% referral fee" },
};

export async function pricingAgent(
  product: ProductInput,
  marketData: MarketData,
  platforms: Platform[]
): Promise<Pricing> {
  const hasCost = product.cost != null && product.cost > 0;
  const hasMargin = product.targetMargin != null;

  const prompt = `
You are a pricing expert for SMB (small business) sellers.

Product: ${product.name}
Category: ${product.category}
${hasCost ? `Supplier / production cost: $${product.cost}` : "Supplier cost: not provided"}
${hasMargin ? `Target margin: ${product.targetMargin}%` : "Target margin: aim for 35–50%"}

Live competitor data scraped right now by Browserbase:
${JSON.stringify(marketData, null, 2)}

Platform fee structures (apply these when computing net margin):
${platforms.map((p) => `- ${p}: ${FEES[p].label}`).join("\n")}

For each platform, recommend a commercially viable sell price. Rules:
- Use the live competitor data above. If data is missing for a platform, use your knowledge.
- "undercut": price 5–15% below competitor avg to win volume
- "match": price within ±5% of competitor avg
- "premium": price above competitor avg when the product's quality / handmade nature justifies it
- margin is the % of the sell price left after deducting the platform fee and cost (if provided)
- rationale must be one clear sentence explaining the pricing decision

Return ONLY this JSON, no prose, no code fences:
{
${platforms
  .map(
    (p) =>
      `  "${p}": { "price": number, "margin": number, "competitorAvg": number, "positioning": "undercut" | "match" | "premium", "rationale": "string" }`
  )
  .join(",\n")}
}
`.trim();

  return callWafer<Pricing>(prompt, product.images);
}
