// Serializes the full launch kit to a single markdown file the SMB owner can
// open in any editor or paste into a doc. Two entry points:
//   buildKitMarkdown(kit, marketing) → string  (server-safe, no DOM)
//   downloadKitMarkdown(kit, marketing)        (client only, uses Blob/anchor)

import type {
  AmazonListing,
  EbayListing,
  EtsyListing,
  FacebookListing,
  LaunchKit,
  MarketingOutputs,
  Platform,
  WalmartListing,
} from "./types";

const PLATFORM_ORDER: Platform[] = [
  "amazon",
  "etsy",
  "ebay",
  "walmart",
  "facebook",
];

export function buildKitMarkdown(
  kit: LaunchKit,
  marketing: MarketingOutputs,
): string {
  const out: string[] = [];
  const w = (s = "") => out.push(s);
  const hr = () => {
    out.push("");
    out.push("---");
    out.push("");
  };

  w(`# ${kit.product.name} — Launch Kit`);
  w("");
  w(`**Category:** ${kit.product.category}`);
  if (kit.product.description) w(`**Description:** ${kit.product.description}`);
  hr();

  w("## Market Data (live, via Browserbase)");
  w("");
  for (const platform of PLATFORM_ORDER) {
    const md = kit.marketData[platform];
    if (!md) continue;
    const avg = md.avgPrice ?? md.avgSoldPrice;
    const kw = md.topKeywords ?? md.topTags ?? [];
    w(
      `- **${platform}** — avg ${avg != null ? `$${avg.toFixed(2)}` : "n/a"}${
        kw.length ? `, keywords: ${kw.join(", ")}` : ""
      }`,
    );
  }
  hr();

  w("## Pricing");
  w("");
  for (const platform of PLATFORM_ORDER) {
    const p = kit.pricing[platform];
    if (!p) continue;
    w(`### ${platform}`);
    w(`- Recommended: **$${p.price.toFixed(2)}** (${p.positioning})`);
    w(`- Competitor avg: $${p.competitorAvg.toFixed(2)}`);
    w(`- Margin after fees: ${p.margin}%`);
    w(`- Rationale: ${p.rationale}`);
    w("");
  }
  hr();

  w("## Listings");
  w("");
  for (const platform of PLATFORM_ORDER) {
    const l = kit.listings[platform];
    if (!l) continue;
    w(`### ${platform}`);
    w(`**Title:** ${l.title}`);

    if (platform === "amazon") {
      const a = l as AmazonListing;
      w("");
      w("**Bullets:**");
      for (const b of a.bullets) w(`- ${b}`);
      w("");
      w(`**Backend keywords:** ${a.keywords.join(", ")}`);
    } else if (platform === "etsy") {
      const e = l as EtsyListing;
      w("");
      w(`**Tags:** ${e.tags.join(", ")}`);
      w("");
      w(e.description);
    } else if (platform === "ebay") {
      const eb = l as EbayListing;
      w("");
      w(`**Condition:** ${eb.condition}`);
      w("");
      w("**Specs:**");
      for (const [k, v] of Object.entries(eb.specs)) w(`- ${k}: ${v}`);
      if (eb.format) {
        w("");
        w(`**Format:** ${eb.format}${eb.rationale ? ` — ${eb.rationale}` : ""}`);
      }
    } else if (platform === "walmart") {
      const wm = l as WalmartListing;
      w("");
      w(wm.description);
      if (wm.specs) {
        w("");
        w("**Specs:**");
        for (const [k, v] of Object.entries(wm.specs)) w(`- ${k}: ${v}`);
      }
    } else if (platform === "facebook") {
      const fb = l as FacebookListing;
      w("");
      w(fb.description);
    }
    w("");
  }
  hr();

  w("## Meta Ads");
  w("");
  if (marketing.meta) {
    for (const v of marketing.meta.variants) {
      w(`### ${v.type}`);
      w(`- **Headline:** ${v.headline}`);
      w(`- **Primary text:** ${v.primaryText}`);
      w(`- **CTA:** ${v.cta}`);
      w("");
    }
  } else {
    w("_No Meta ads generated._");
  }
  hr();

  w("## TikTok Concepts");
  w("");
  if (marketing.tiktok) {
    marketing.tiktok.scripts.forEach((s, i) => {
      w(`### Concept ${i + 1}`);
      w(`- **Hook:** ${s.hook}`);
      w(`- **Body:** ${s.body}`);
      w(`- **Caption:** ${s.caption}`);
      w(`- **Hashtags:** ${s.hashtags.join(" ")}`);
      w("");
    });
  } else {
    w("_No TikTok concepts generated._");
  }
  hr();

  w("## Email Launch Sequence");
  w("");
  if (marketing.email) {
    marketing.email.emails.forEach((e, i) => {
      w(`### Email ${i + 1} — ${e.stage}`);
      w(`**Subject:** ${e.subject}`);
      w(`**Preheader:** ${e.preheader}`);
      w("");
      w(e.body);
      w("");
    });
  } else {
    w("_No email sequence generated._");
  }
  hr();

  w("## 7-Day Social Caption Bank");
  w("");
  if (marketing.social) {
    for (const d of marketing.social.days) {
      w(`### Day ${d.day}`);
      for (const p of d.posts) {
        w(`- **${p.channel}:** ${p.caption}`);
        w(`  ${p.hashtags.join(" ")}`);
      }
      w("");
    }
  } else {
    w("_No social captions generated._");
  }

  return out.join("\n");
}

export function downloadKitMarkdown(
  kit: LaunchKit,
  marketing: MarketingOutputs,
): void {
  const md = buildKitMarkdown(kit, marketing);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName =
    kit.product.name
      .replace(/[^a-z0-9-_ ]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || "launch-kit";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
