# 🛒 SMB Multi-Platform Seller — Hackathon Build Plan v2
### 2-Person Sell Side | < 24 Hours | No Snowflake

---

## The Product
An SMB owner (jeweler, clothing brand, candle maker) inputs their product info and photos. A swarm of agents automatically generates optimized listings, ads, and pricing across every major selling platform — all in under 60 seconds.

---

## The Split

```
PERSON 1 — Input → Pricing → Platform Listings
PERSON 2 — Marketing Agents → Dashboard → Output
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
Uses Claude's knowledge of platform fee structures to recommend optimal prices per platform.

```js
const pricingAgent = async (product) => {
  const prompt = `
    You are a pricing expert for SMB sellers.
    Product: ${product.name}
    Category: ${product.category}
    Supplier cost: $${product.cost}
    Target margin: ${product.targetMargin}%

    Recommend optimal sell prices per platform after fees:
    - Amazon (15% referral fee)
    - Etsy (6.5% transaction fee)
    - eBay (13% final value fee)
    - Walmart (15% referral fee)
    - Facebook Marketplace (0% fee)

    For each platform return:
    - recommended_price
    - margin_pct after fees
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
const runListingAgents = async (product, pricing) => {
  const agents = product.platforms.map(platform =>
    listingAgent(platform, product, pricing)
  );
  return await Promise.all(agents); // all fire simultaneously
};
```

#### 4. Individual Listing Agent Template

```js
const listingAgent = async (platform, product, pricing) => {
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
  "pricing": {
    "amazon":   { "price": 49.99, "margin": 34, "rationale": "Competitive for handmade jewelry" },
    "etsy":     { "price": 54.99, "margin": 41, "rationale": "Story-driven buyers pay premium" },
    "ebay":     { "price": 44.99, "margin": 28, "rationale": "Price-sensitive auction buyers" },
    "walmart":  { "price": 47.99, "margin": 31, "rationale": "Mid-market positioning" },
    "facebook": { "price": 42.00, "margin": 47, "rationale": "No fees, local buyers" }
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
const metaAdAgent = async (product, listings) => {
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
┌──────────────────────────────────────────────────────┐
│  ✅ Swarm Complete — 9 agents, 47 seconds            │
├───────────┬───────┬───────┬─────────┬────────────────┤
│  Amazon   │ Etsy  │  eBay │ Walmart │ Facebook       │
├───────────┴───────┴───────┴─────────┴────────────────┤
│  [Generated listing copy — copy-paste ready]         │
│  [Recommended price + margin breakdown]              │
├──────────────────────────────────────────────────────┤
│  📣 Meta Ads    🎵 TikTok    📧 Email    📱 Social    │
├──────────────────────────────────────────────────────┤
│  [Marketing outputs per tab]                         │
└──────────────────────────────────────────────────────┘
```

#### 6. Export
- Copy-to-clipboard button per platform
- Download full kit as single PDF or ZIP

---

## 🔗 Shared Claude API Helper (Both Use This)

```js
// shared/claude.js
const callClaude = async (prompt, images = []) => {
  const content = [
    ...images.map(img => ({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: img }
    })),
    { type: "text", text: prompt }
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content }]
    })
  });

  const data = await response.json();
  const text = data.content.map(i => i.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

export default callClaude;
```

---

## 📁 Repo Structure

```
/
├── shared/
│   └── claude.js          ← shared API helper (set up together hour 1)
├── person1/
│   ├── InputUI.jsx        ← product form + image upload
│   ├── pricingAgent.js    ← pricing per platform
│   └── listingAgents.js   ← 5 platform listing agents
├── person2/
│   ├── metaAdAgent.js     ← Facebook/Instagram ads
│   ├── tiktokAgent.js     ← TikTok hooks + captions
│   ├── emailAgent.js      ← 3-email launch sequence
│   ├── socialAgent.js     ← 7-day caption bank
│   └── Dashboard.jsx      ← unified output UI
└── App.jsx                ← orchestration + Promise.all
```

---

## 🕐 Hour-by-Hour Timeline

| Hours | Person 1 | Person 2 |
|---|---|---|
| **0–1** | 🤝 Together: set up repo, agree on output schema, wire shared claude.js helper |  |
| **1–4** | Input UI + image upload working | Dashboard shell + tab structure |
| **4–8** | Pricing Agent + Amazon + Etsy agents | Meta Ad Agent + TikTok Agent |
| **8–12** | eBay + Walmart + Facebook agents | Email Agent + Social Agent |
| **12–14** | ⚠️ Integration checkpoint — plug everything together end-to-end | |
| **14–17** | Polish listing outputs, edge cases | Polish dashboard UI |
| **17–20** | Full end-to-end demo run | Export (copy + download) |
| **20–22** | Fix integration bugs | Fix integration bugs |
| **22–23** | Rehearse pitch | Prep demo data (ring, t-shirt, candle) |
| **23–24** | 🧊 Freeze code — critical fixes only | |

---

## ⚠️ Integration Checkpoint (Hour 12)
Verify before moving on:
- [ ] Input UI fires all agents on button click
- [ ] All listing agents run in parallel via Promise.all
- [ ] Person 2's agents consume Person 1's output schema correctly
- [ ] Dashboard renders at least one real agent output

**If behind:** Cut Walmart + Facebook listings. Focus on Amazon + Etsy only. Cut TikTok agent. Core demo is still strong.

---

## 🎯 Demo Script (60 seconds)

1. **Input** — type "Handmade Silver Ring, $8 cost" + upload photo, select all platforms
2. **Hit Launch** — show 9 agents firing in parallel with live status indicators
3. **Listings tab** — show Amazon listing, flip to Etsy (completely different tone and structure)
4. **Pricing tab** — "Etsy recommended at $54.99 — 41% margin after fees. Facebook at $42 — 47% margin, no fees"
5. **Ads tab** — show 3 Meta ad variants ready to paste into Ads Manager
6. **Email tab** — show 3-email launch sequence ready to go
7. **Pitch line** — *"This took 47 seconds. Doing this manually takes a full day — and most SMB owners never do it at all."*

---

## 🏆 Why This Wins

- **Swarm is visible** — judges see agents firing in parallel, not a black box
- **SMB story is relatable** — every judge knows a small business owner
- **No deployment risk** — pure generation, nothing to break on stage
- **Scope is tight** — every feature serves the core demo
- **Clear business model** — $29/month per SMB, or pay-per-launch-kit
- **Snowflake ready** — easy to add post-hackathon for the "gets smarter over time" story
