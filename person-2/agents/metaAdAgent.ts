import { callWafer } from "@/lib/callWafer";
import type { LaunchKit, MetaAdsOutput } from "../types";

export async function metaAdAgent(kit: LaunchKit): Promise<MetaAdsOutput> {
  const { product, listings, marketData, pricing } = kit;

  const storyHint =
    listings.etsy?.description ?? product.description ?? product.name;
  const fbAvg = marketData.facebook?.avgPrice;
  const fbPrice = pricing.facebook?.price ?? pricing.amazon?.price;

  const prompt = `
You are a Meta Ads (Facebook/Instagram) expert for small-business sellers.

Product: ${product.name}
Category: ${product.category}
Story hint (use for tone, not as a quote): ${storyHint}
Our Facebook price: ${fbPrice != null ? `$${fbPrice}` : "n/a"}
Competitor avg on Facebook Marketplace: ${fbAvg != null ? `$${fbAvg}` : "n/a"}

Generate exactly 3 ad variants for Meta Ads Manager:
1. type "awareness" — pattern-interrupt hook, NO hard CTA, build curiosity
2. type "consideration" — benefit-led, soft CTA (e.g. "Learn More")
3. type "conversion" — urgency or scarcity, strong CTA (e.g. "Shop Now", "Buy Now")

Constraints PER variant:
- headline: max 40 chars
- primaryText: max 125 chars
- cta: a short Meta-approved button label

Voice: human, specific, no marketing clichés ("Discover...", "Unleash...", "Experience...").
Where the product image is the visual hook, the copy should NOT describe the image —
it should add information the image can't show.

Return ONLY this JSON, no prose, no code fences:
{
  "variants": [
    { "type": "awareness", "headline": "...", "primaryText": "...", "cta": "..." },
    { "type": "consideration", "headline": "...", "primaryText": "...", "cta": "..." },
    { "type": "conversion", "headline": "...", "primaryText": "...", "cta": "..." }
  ]
}
Return JSON only.
`.trim();

  return await callWafer<MetaAdsOutput>(prompt, product.images);
}
