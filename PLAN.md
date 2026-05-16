# 🛒 SMB Multi-Platform Seller — Hackathon Build Plan v2
### 2-Person Sell Side | < 24 Hours | No Snowflake

---

## The Product
An SMB owner (jeweler, clothing brand, candle maker) inputs their product info and photos. A swarm of agents automatically generates optimized listings, ads, and pricing across every major selling platform — all in under 60 seconds.

**Key differentiator**: Before Claude writes a single word, Browserbase scrapes live competitor listings and real market prices from each platform. Claude then generates listings and pricing grounded in actual market data — not hallucinated guesses.

---

## The Split

```
PERSON 1 — Input → Browserbase Research → Pricing → Platform Listings
PERSON 2 — Marketing Agents → Dashboard → Output
```

---

## 🌐 Browserbase — Market Research Layer (Person 1, runs first)

Before any Claude agents fire, Browserbase runs parallel headless browser sessions to scrape live market data. This feeds into both the Pricing Agent and all Listing Agents.

### What Browserbase Scrapes (per platform, in parallel)

| Platform | What We Scrape |
|---|---|
| **Amazon** | Top 5 similar product prices, avg rating, top keywords from titles |
| **Etsy** | Top 5 listing prices, top tags used, bestseller badge presence |
| **eBay** | Sold listing prices (last 30 days), condition distribution |
| **Walmart** | Shelf price range for category, top spec fields used |
| **Facebook** | Local listing prices for same category in user's region |

### Browserbase Research Agent

```js
// shared/browserbaseResearch.js
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

const researchPlatform = async (platform, product) => {
  const session = await bb.sessions.create({ projectId: process.env.BROWSERBASE_PROJECT_ID });
  
  const searchQueries = {
    amazon:   `https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`,
    etsy:     `https://www.etsy.com/search?q=${encodeURIComponent(product.name)}`,
    ebay:     `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.name)}&LH_Sold=1`,
    walmart:  `https://www.walmart.com/search?q=${encodeURIComponent(product.name)}`,
    facebook: `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(product.name)}`
  };

  // Use Stagehand (built on Browserbase) for AI-powered extraction
  const { Stagehand } = await import("@browserbasehq/stagehand");
  const stagehand = new Stagehand({ sessionId: session.id });
  await stagehand.init();
  await stagehand.page.goto(searchQueries[platform]);

  const data = await stagehand.extract({
    instruction: `Extract the top 5 listings: product title, price, and any tags or keywords visible.`,
    schema: {
      listings: [{ title: "string", price: "number", tags: ["string"] }]
    }
  });

  await stagehand.close();
  return { platform, ...data };
};

export const runMarketResearch = async (product, platforms) => {
  // All platform scrapes fire simultaneously
  const results = await Promise.all(
    platforms.map(p => researchPlatform(p, product))
  );
  return Object.fromEntries(results.map(r => [r.platform, r]));
};
```

### Research Output Schema (fed into Pricing + Listing agents)

```json
{
  "marketData": {
    "amazon":   { "priceRange": [34.99, 79.99], "avgPrice": 52.40, "topKeywords": ["sterling silver", "handmade ring", "gift for her"] },
    "etsy":     { "priceRange": [38.00, 95.00], "avgPrice": 61.50, "topTags": ["handmade jewelry", "silver ring", "boho"] },
    "ebay":     { "soldPriceRange": [28.00, 55.00], "avgSoldPrice": 41.00 },
    "walmart":  { "priceRange": [19.99, 49.99], "avgPrice": 32.50 },
    "facebook": { "priceRange": [25.00, 60.00], "avgPrice": 38.00 }
  }
}
```

---

## 👤 Person 1 — "Input & Listings"

### What You Build

#### 1. Input UI
- Product name, category, description
- Cost price + target margin
- Platform selector (Amazon, Etsy, eBay, Walmart, Facebook)
- Image upload (base64 for Claude API)
- "Launch Swarm" button that fires all agents

#### 2. Pricing Agent
Uses Claude + **live Browserbase market data** to recommend optimal prices per platform.

```js
const pricingAgent = async (product, marketData) => {
  const prompt = `
    You are a pricing expert for SMB sellers.
    Product: ${product.name}
    Category: ${product.category}
    Supplier cost: $${product.cost}
    Target margin: ${product.targetMargin}%

    Live market data from Browserbase (scraped right now):
    ${JSON.stringify(marketData, null, 2)}

    Platform fee structures:
    - Amazon (15% referral fee)
    - Etsy (6.5% transaction fee)
    - eBay (13% final value fee)
    - Walmart (15% referral fee)
    - Facebook Marketplace (0% fee)

    Using the real competitor prices above, recommend optimal sell prices per platform.
    Position competitively — not just covering fees.

    For each platform return:
    - recommended_price
    - margin_pct after fees
    - competitor_avg (from market data)
    - positioning ("undercut" | "match" | "premium")
    - one-line pricing rationale

    Return JSON only.
  `;
  return await callClaude(prompt);
};
```

#### 3. Marketplace Listing Agents (all run in parallel)

| Agent | Platform Rules |
|---|---|
| **Amazon** | 200 char title, 5 bullet points, backend keywords, A9 SEO |
| **Etsy** | Story-driven, exactly 13 tags, handmade narrative, 140 char title |
| **eBay** | Condition field, item specifics, auction vs buy-now recommendation |
| **Walmart** | Taxonomy-compliant, spec-heavy, no brand fluff |
| **Facebook** | Local tone, simple description, price anchoring, pickup/shipping note |

```js
const runListingAgents = async (product, pricing, marketData) => {
  const agents = product.platforms.map(platform =>
    listingAgent(platform, product, pricing, marketData)
  );
  return await Promise.all(agents); // all fire simultaneously
};
```

#### 4. Individual Listing Agent Template

```js
const listingAgent = async (platform, product, pricing, marketData) => {
  const rules = {
    amazon: `Write a 200 char keyword-rich title, 5 bullet points starting with capitals,
             and 10 backend search keywords. Optimize for Amazon A9 algorithm.`,
    etsy:   `Write a story-driven title under 140 chars, a warm handmade-focused description,
             and exactly 13 tags as an array. Speak to gift buyers and craft lovers.`,
    ebay:   `Write a spec-heavy title, item condition, key item specifics as key:value pairs,
             and recommend auction vs buy-now with rationale.`,
    walmart:`Write a taxonomy-compliant title, spec-focused description, no promotional language.`,
    facebook:`Write a short casual local-market description, note pickup or shipping availability.`
  };

  const prompt = `
    You are a ${platform} listing expert.
    Product: ${product.name}
    Description: ${product.description}
    Price on ${platform}: $${pricing[platform].price}
    Images provided.

    Live competitor data from Browserbase:
    - Competitor avg price: $${marketData[platform]?.avgPrice}
    - Top keywords/tags competitors use: ${JSON.stringify(marketData[platform]?.topKeywords || marketData[platform]?.topTags)}

    Use this real market data to write a listing that outcompetes these results.

    ${rules[platform]}

    Return JSON only.
  `;
  return { platform, ...(await callClaude(prompt, product.images)) };
};
```

---

### Person 1 Output Schema
Hand this to Person 2 when complete:

```json
{
  "product": {
    "name": "Handmade Silver Ring",
    "category": "jewelry",
    "images": ["base64..."]
  },
  "marketData": {
    "amazon":   { "avgPrice": 52.40, "topKeywords": ["sterling silver", "handmade ring"] },
    "etsy":     { "avgPrice": 61.50, "topTags": ["handmade jewelry", "silver ring"] },
    "ebay":     { "avgSoldPrice": 41.00 },
    "walmart":  { "avgPrice": 32.50 },
    "facebook": { "avgPrice": 38.00 }
  },
  "pricing": {
    "amazon":   { "price": 49.99, "margin": 34, "competitorAvg": 52.40, "positioning": "undercut", "rationale": "Slightly below avg to capture Buy Box" },
    "etsy":     { "price": 54.99, "margin": 41, "competitorAvg": 61.50, "positioning": "undercut", "rationale": "Story-driven buyers pay premium but we undercut bestsellers" },
    "ebay":     { "price": 44.99, "margin": 28, "competitorAvg": 41.00, "positioning": "match", "rationale": "Match sold price avg for auction conversion" },
    "walmart":  { "price": 47.99, "margin": 31, "competitorAvg": 32.50, "positioning": "premium", "rationale": "Handmade commands premium over mass-market" },
    "facebook": { "price": 42.00, "margin": 47, "competitorAvg": 38.00, "positioning": "match", "rationale": "No fees, local buyers, match local market" }
  },
  "listings": {
    "amazon":   { "title": "...", "bullets": [...], "keywords": [...] },
    "etsy":     { "title": "...", "tags": [...], "description": "..." },
    "ebay":     { "title": "...", "condition": "New", "specs": {...} },
    "walmart":  { "title": "...", "description": "..." },
    "facebook": { "title": "...", "description": "..." }
  }
}
```

---

## 👤 Person 2 — "Marketing & Output"

### What You Build

#### 1. Meta Ad Agent (Facebook/Instagram)
```js
const metaAdAgent = async (product, listings, marketData) => {
  const prompt = `
    You are a Meta ads expert for small businesses.
    Product: ${product.name}
    Context from listing: ${listings.etsy.description}

    Generate 3 ad variants:
    1. Awareness — hook-driven, no hard CTA
    2. Consideration — benefit-led, soft CTA
    3. Conversion — urgency, strong CTA

    Each needs:
    - headline (40 chars max)
    - primary text (125 chars max)
    - CTA button label

    Return JSON only.
  `;
  return await callClaude(prompt, product.images);
};
```

#### 2. TikTok Agent
```js
// Returns 3 video script hooks + caption + hashtags
// Style: trend-aware, punchy, pattern-interrupt openers
// Example hook: "POV: you just found the perfect handmade gift under $55"
```

#### 3. Email Sequence Agent
```js
// Returns 3-email launch sequence:
// Email 1 — Welcome + product story + brand intro
// Email 2 — Benefits + social proof + FAQ
// Email 3 — Limited promo + urgency CTA
```

#### 4. Social Caption Bank Agent
```js
// Returns 7 days of captions
// Variants per platform: Instagram, Facebook, Pinterest
// Includes hashtag sets per post
```

#### 5. Output Dashboard UI
Unified tabbed dashboard rendering all agent outputs:

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ Swarm Complete — 10 agents, 47 seconds                   │
│  🌐 Live market data pulled from 5 platforms via Browserbase │
├───────────┬───────┬───────┬─────────┬────────────────────────┤
│  Amazon   │ Etsy  │  eBay │ Walmart │ Facebook               │
├───────────┴───────┴───────┴─────────┴────────────────────────┤
│  [Generated listing copy — copy-paste ready]                 │
│  [Recommended price vs competitor avg + positioning]         │
├──────────────────────────────────────────────────────────────┤
│  📣 Meta Ads    🎵 TikTok    📧 Email    📱 Social            │
├──────────────────────────────────────────────────────────────┤
│  [Marketing outputs per tab]                                 │
└──────────────────────────────────────────────────────────────┘
```

#### 6. Export
- Copy-to-clipboard button per platform
- Download full kit as single PDF or ZIP

---

## 🔗 Shared Wafer Pass Helper (Both Use This)

Model: **Wafer Pass** — flat-rate access to the fastest open-source LLMs (YC-backed).
Default model: `Qwen3.5-397B-A17B` (262K context). Fallback: `GLM-5.1`.
API is OpenAI-compatible at `https://pass.wafer.ai/v1`.

```ts
// src/lib/callWafer.ts — client-side helper (calls Next.js API route)
export async function callWafer(prompt, images = [], model) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, images, model }),
  });
  if (!res.ok) throw new Error(`Wafer error ${res.status}`);
  return res.json();
}
```

```ts
// src/app/api/generate/route.ts — server-side proxy (keeps API key safe)
// POST body: { prompt: string, images?: string[], model?: string }
// Calls https://pass.wafer.ai/v1/chat/completions
// Strips markdown fences and parses JSON before returning
```

**Environment variable needed:**
```
WAFER_API_KEY=   # from wafer.ai dashboard
```

---

## 📁 Repo Structure

```
/
├── shared/
│   ├── claude.js                ← shared Claude API helper
│   └── browserbaseResearch.js   ← Browserbase market scraper (NEW)
├── person1/
│   ├── InputUI.jsx              ← product form + image upload
│   ├── pricingAgent.js          ← pricing per platform (uses market data)
│   └── listingAgents.js         ← 5 platform listing agents (uses market data)
├── person2/
│   ├── metaAdAgent.js           ← Facebook/Instagram ads
│   ├── tiktokAgent.js           ← TikTok hooks + captions
│   ├── emailAgent.js            ← 3-email launch sequence
│   ├── socialAgent.js           ← 7-day caption bank
│   └── Dashboard.jsx            ← unified output UI
└── App.jsx                      ← orchestration + Promise.all
```

---

## 🕐 Agent Execution Order

```
[User hits "Launch Swarm"]
         │
         ▼
┌─────────────────────────────────────┐
│  Browserbase Research (parallel)    │  ← scrapes all 5 platforms at once
│  amazon │ etsy │ ebay │ wmt │ fb   │
└─────────────────────────────────────┘
         │  marketData
         ▼
┌──────────────────────┐
│   Pricing Agent      │  ← Claude + real prices → platform pricing
└──────────────────────┘
         │  pricing + marketData
         ▼
┌─────────────────────────────────────────────────────┐
│  Listing Agents (parallel)  │  Marketing (parallel) │
│  amazon │ etsy │ ebay │...  │  meta │ tiktok │ ...  │
└─────────────────────────────────────────────────────┘
         │
         ▼
    Dashboard renders
```

---

## 🕐 Hour-by-Hour Timeline

| Hours | Person 1 | Person 2 |
|---|---|---|
| **0–1** | 🤝 Together: set up repo, agree on output schema, wire shared claude.js + browserbaseResearch.js |  |
| **1–3** | Browserbase research agent working (all 5 platforms) | Dashboard shell + tab structure |
| **3–5** | Input UI + image upload working | Meta Ad Agent + TikTok Agent |
| **5–8** | Pricing Agent (Claude + market data) + Amazon + Etsy agents | Email Agent + Social Agent |
| **8–12** | eBay + Walmart + Facebook agents | Dashboard wired to real data |
| **12–14** | ⚠️ Integration checkpoint — plug everything together end-to-end | |
| **14–17** | Polish listing outputs, edge cases | Polish dashboard UI |
| **17–20** | Full end-to-end demo run | Export (copy + download) |
| **20–22** | Fix integration bugs | Fix integration bugs |
| **22–23** | Rehearse pitch | Prep demo data (ring, t-shirt, candle) |
| **23–24** | 🧊 Freeze code — critical fixes only | |

---

## ⚠️ Integration Checkpoint (Hour 12)
Verify before moving on:
- [ ] Browserbase research agent returns market data for all platforms
- [ ] Input UI fires all agents on button click (research → pricing → listings)
- [ ] All listing agents run in parallel via Promise.all
- [ ] Pricing agent shows competitor avg alongside recommended price
- [ ] Person 2's agents consume Person 1's output schema correctly
- [ ] Dashboard renders at least one real agent output

**If behind:** Skip Browserbase and fall back to Claude-only pricing. Cut Walmart + Facebook listings. Focus on Amazon + Etsy only. Cut TikTok agent. Core demo is still strong.

---

## 🎯 Demo Script (60 seconds)

1. **Input** — type "Handmade Silver Ring, $8 cost" + upload photo, select all platforms
2. **Hit Launch** — show Browserbase scraping 5 platforms live, then 9 Claude agents firing in parallel
3. **Pricing tab** — "Amazon competitors average $52 — we're recommending $49.99 to undercut and win the Buy Box. Etsy competitors average $61 — we're pricing at $54.99, undercutting bestsellers"
4. **Listings tab** — show Amazon listing, flip to Etsy (completely different tone and structure)
5. **Ads tab** — show 3 Meta ad variants ready to paste into Ads Manager
6. **Email tab** — show 3-email launch sequence ready to go
7. **Pitch line** — *"This took 47 seconds. And unlike other tools, we didn't guess the prices — we checked what your competitors are actually charging, right now."*

---

## 🏆 Why This Wins

- **Swarm is visible** — judges see Browserbase + agents firing in parallel, not a black box
- **Real data, not hallucinations** — Browserbase grounds pricing in live market reality
- **SMB story is relatable** — every judge knows a small business owner
- **No deployment risk** — pure generation + scraping, nothing to break on stage
- **Scope is tight** — every feature serves the core demo
- **Clear business model** — $29/month per SMB, or pay-per-launch-kit
- **Snowflake ready** — easy to add post-hackathon for the "gets smarter over time" story

## 📦 New Dependencies

```bash
npm install @browserbasehq/sdk @browserbasehq/stagehand
```

**Environment variables needed:**
```
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
ANTHROPIC_API_KEY=
```
