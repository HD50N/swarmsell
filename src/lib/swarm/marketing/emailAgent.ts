import { callWafer } from "@/lib/callWafer";
import type { EmailSequenceOutput, LaunchKit } from "../types";

export async function emailAgent(kit: LaunchKit): Promise<EmailSequenceOutput> {
  const { product, listings, pricing } = kit;

  const storyHint = listings.etsy?.description ?? product.description ?? "";
  const launchPrice =
    pricing.etsy?.price ?? pricing.amazon?.price ?? pricing.facebook?.price;

  const prompt = `
You are an email marketing copywriter for SMB e-commerce brands.

Product: ${product.name}
Category: ${product.category}
Story hint (for tone, not a direct quote): ${storyHint}
Launch price: ${launchPrice != null ? `$${launchPrice}` : "n/a"}

Write a 3-email launch sequence as plain text (no HTML, no markdown):

Email 1 — stage "welcome": warm intro, product story, brand intro, no hard sell.
Email 2 — stage "benefits": concrete benefits, light social-proof framing, light FAQ.
Email 3 — stage "promo": time-limited offer, urgency, one clear CTA.

Per email:
- subject: max 60 chars, scannable, NOT clickbait
- preheader: max 90 chars, complements (does not repeat) the subject
- body: 4-7 short paragraphs, warm conversational tone, end with ONE clear CTA line

Sound like a real person who makes this product, not a brand bot.
Do not invent specific customer names or fake reviews.
Keep each body under ~700 characters.

Return ONLY this JSON, no prose, no code fences:
{
  "emails": [
    { "stage": "welcome",  "subject": "...", "preheader": "...", "body": "..." },
    { "stage": "benefits", "subject": "...", "preheader": "...", "body": "..." },
    { "stage": "promo",    "subject": "...", "preheader": "...", "body": "..." }
  ]
}
Return JSON only.
`.trim();

  return await callWafer<EmailSequenceOutput>(prompt);
}
