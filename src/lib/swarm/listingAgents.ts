import { callWafer } from "@/lib/callWafer";
import type {
  ProductInput,
  MarketData,
  Pricing,
  Listings,
  Platform,
} from "./types";

const RULES: Record<Platform, string> = {
  amazon: `Write an Amazon listing optimised for the A9 search algorithm.
- title: keyword-rich, max 200 chars, most important keyword first
- bullets: exactly 5 items. Each MUST start with a short ALL-CAPS phrase followed by " — " (e.g. "PREMIUM MATERIAL — ...")
- keywords: exactly 10 backend search terms not already in the title or bullets

Return JSON: { "title": string, "bullets": string[], "keywords": string[] }`,

  etsy: `Write an Etsy listing that speaks to gift buyers and craft lovers.
- title: story-driven, max 140 chars, primary search term near the start
- description: 3–4 warm paragraphs. Highlight the handmade process, uniqueness, and gifting angle.
- tags: exactly 13 tags as an array. Max 20 chars each (spaces allowed). Mix broad and long-tail.

Return JSON: { "title": string, "description": string, "tags": string[] }`,

  ebay: `Write a spec-heavy eBay listing for buy-now or auction.
- title: max 80 chars, include material + condition keyword
- condition: one of "Brand New" | "New other (see details)" | "Used"
- specs: 4–6 key:value item specifics (e.g. Material, Style, Occasion, Package Contents)
- format: "buy-now" or "auction"
- rationale: one sentence why you chose that format

Return JSON: { "title": string, "condition": string, "specs": { [key: string]: string }, "format": "buy-now" | "auction", "rationale": string }`,

  walmart: `Write a Walmart listing that is taxonomy-compliant and spec-first.
- title: no promotional language (no "Amazing", "Best", "Perfect"), max 75 chars
- description: spec-first paragraph — material, dimensions if known, care instructions, no marketing fluff
- specs: optional 3–5 key:value pairs for Walmart's item details

Return JSON: { "title": string, "description": string, "specs"?: { [key: string]: string } }`,

  facebook: `Write a casual Facebook Marketplace listing for local + shipping buyers.
- title: short and direct, mention price or deal hook, max 60 chars
- description: 2–3 casual sentences. Local-market tone. Mention local pickup and/or shipping option.

Return JSON: { "title": string, "description": string }`,
};

async function listingAgent(
  platform: Platform,
  product: ProductInput,
  pricing: Pricing,
  marketData: MarketData
): Promise<Listings[typeof platform]> {
  const price = pricing[platform]?.price;
  const md = marketData[platform];
  const topTerms = md?.topKeywords ?? md?.topTags ?? [];

  const prompt = `
You are a ${platform} listing expert for small-business sellers.

Product: ${product.name}
Category: ${product.category}
${product.description ? `Seller's description: ${product.description}` : ""}
Our price on ${platform}: ${price != null ? `$${price}` : "TBD"}

Live Browserbase competitor data for ${platform}:
- Competitor avg price: ${md?.avgPrice ?? md?.avgSoldPrice ?? "n/a"}
- Top keywords/tags used by top competitors: ${topTerms.length ? topTerms.join(", ") : "n/a"}

Instructions:
${RULES[platform]}

Voice rules:
- Specific and benefit-driven, never vague ("stunning", "beautiful", "amazing")
- If the product is handmade, call out the craft process and uniqueness concretely
- Do not repeat the same phrase across bullet points or sentences

Return ONLY the JSON described above — no prose, no code fences.
`.trim();

  return callWafer(prompt, product.images);
}

export async function runListingAgents(
  product: ProductInput,
  pricing: Pricing,
  marketData: MarketData,
  platforms: Platform[]
): Promise<Listings> {
  const settled = await Promise.allSettled(
    platforms.map((p) => listingAgent(p, product, pricing, marketData))
  );

  const listings: Listings = {};
  platforms.forEach((p, i) => {
    const r = settled[i];
    if (r.status === "fulfilled" && r.value != null) {
      (listings as Record<string, unknown>)[p] = r.value;
    } else if (r.status === "rejected") {
      console.error(`[listingAgents] ${p} failed:`, r.reason);
    }
  });

  return listings;
}
