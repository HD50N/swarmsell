import { callWafer } from "@/lib/callWafer";
import type { LaunchKit, TikTokOutput } from "../types";

export async function tiktokAgent(kit: LaunchKit): Promise<TikTokOutput> {
  const { product, marketData } = kit;

  const keywords = [
    ...(marketData.etsy?.topTags ?? []),
    ...(marketData.amazon?.topKeywords ?? []),
  ];

  const prompt = `
You are a TikTok growth strategist for SMB sellers.

Product: ${product.name}
Category: ${product.category}
Real keywords competitors rank for: ${keywords.join(", ") || "n/a"}

Write 3 short-form video concepts. Each MUST start with a pattern-interrupt hook
that earns the first 2 seconds. TikTok rewards story and personality — NOT ads.
Do NOT include "buy now" CTAs. Do NOT use corporate voice.

Per concept include:
- hook: first 1-2 seconds, spoken or on-screen text (max 80 chars)
- body: 2-3 sentence description of what happens visually after the hook
- caption: short TikTok caption (max 150 chars), can be lowercase, lightly imperfect
- hashtags: 4-6 relevant hashtags, each starting with "#"

Vary the concepts:
- Concept 1: a "POV:" or relatable moment
- Concept 2: behind-the-scenes / maker / process
- Concept 3: a value-shift or contrarian take

Return ONLY this JSON, no prose, no code fences:
{
  "scripts": [
    { "hook": "...", "body": "...", "caption": "...", "hashtags": ["#a","#b"] },
    { "hook": "...", "body": "...", "caption": "...", "hashtags": ["#a","#b"] },
    { "hook": "...", "body": "...", "caption": "...", "hashtags": ["#a","#b"] }
  ]
}
Return JSON only.
`.trim();

  return await callWafer<TikTokOutput>(prompt);
}
