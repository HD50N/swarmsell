import { callWafer } from "@/lib/callWafer";
import type { LaunchKit, SocialOutput } from "../types";

export async function socialAgent(kit: LaunchKit): Promise<SocialOutput> {
  const { product, marketData } = kit;

  const keywords = [
    ...(marketData.etsy?.topTags ?? []),
    ...(marketData.amazon?.topKeywords ?? []),
  ];

  const prompt = `
You are a social media strategist for SMB sellers.

Product: ${product.name}
Category: ${product.category}
Real market keywords/tags from competitors: ${keywords.join(", ") || "n/a"}

Build a 7-day social caption bank — one post per channel per day across Instagram, Facebook, Pinterest.

Per post:
- channel: "instagram" | "facebook" | "pinterest"
- caption: tailored to channel voice
    - instagram: short, lowercase OK, lifestyle/feel
    - facebook: longer, conversational, community-flavored
    - pinterest: descriptive, search-driven, includes the product type
- hashtags: 3-6 hashtags as strings starting with "#", relevant to that channel

Keep captions tight — total output must fit in ~2000 tokens. Suggested theme rotation:
Day 1: origin / why-it-exists
Day 2: behind-the-scenes / process
Day 3: product detail / what makes it different
Day 4: gift framing
Day 5: maker-life / studio
Day 6: weekend / lifestyle moment
Day 7: light urgency / restock / launch

Return ONLY this JSON, no prose, no code fences. Include all 7 days:
{
  "days": [
    { "day": 1, "posts": [
      { "channel": "instagram", "caption": "...", "hashtags": ["#a","#b"] },
      { "channel": "facebook",  "caption": "...", "hashtags": ["#a","#b"] },
      { "channel": "pinterest", "caption": "...", "hashtags": ["#a","#b"] }
    ] }
  ]
}
Return JSON only.
`.trim();

  return await callWafer<SocialOutput>(prompt);
}
