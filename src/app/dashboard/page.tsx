"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentStatus = "queued" | "active" | "complete";

interface Agent {
  id: string;
  name: string;
  phase: 1 | 2 | 3 | 4;
  type: "BROWSERBASE" | "CLAUDE";
  activeLabel: string;
  result: string;
  status: AgentStatus;
  elapsed?: number;
}

// ── Agent definitions ─────────────────────────────────────────────────────────

const INITIAL_AGENTS: Agent[] = [
  { id: "bb-amazon",   name: "Amazon Research",      phase: 1, type: "BROWSERBASE", activeLabel: "Scraping competitor prices...",       result: "5 listings · avg $52.40",               status: "queued" },
  { id: "bb-etsy",     name: "Etsy Research",        phase: 1, type: "BROWSERBASE", activeLabel: "Scraping competitor prices...",       result: "5 listings · avg $61.50",               status: "queued" },
  { id: "bb-ebay",     name: "eBay Research",        phase: 1, type: "BROWSERBASE", activeLabel: "Scraping sold listings...",           result: "10 sold · avg $41.00",                  status: "queued" },
  { id: "bb-walmart",  name: "Walmart Research",     phase: 1, type: "BROWSERBASE", activeLabel: "Scraping shelf prices...",            result: "4 results · avg $32.50",                status: "queued" },
  { id: "bb-facebook", name: "Facebook Research",    phase: 1, type: "BROWSERBASE", activeLabel: "Scraping local listings...",          result: "6 listings · avg $38.00",               status: "queued" },
  { id: "pricing",     name: "Pricing Intelligence", phase: 2, type: "CLAUDE",      activeLabel: "Analyzing market data + fees...",     result: "5 optimal prices computed",             status: "queued" },
  { id: "lst-amazon",  name: "Amazon Listing",       phase: 3, type: "CLAUDE",      activeLabel: "Writing A9-optimized listing...",     result: "Title + 5 bullets + 10 keywords",       status: "queued" },
  { id: "lst-etsy",    name: "Etsy Listing",         phase: 3, type: "CLAUDE",      activeLabel: "Writing story-driven copy...",        result: "Title + description + 13 tags",         status: "queued" },
  { id: "lst-ebay",    name: "eBay Listing",         phase: 3, type: "CLAUDE",      activeLabel: "Writing spec-heavy listing...",       result: "Title + specs + BUY NOW rec",           status: "queued" },
  { id: "lst-walmart", name: "Walmart Listing",      phase: 3, type: "CLAUDE",      activeLabel: "Writing taxonomy-compliant copy...",  result: "Title + spec description",              status: "queued" },
  { id: "lst-facebook",name: "Facebook Listing",     phase: 3, type: "CLAUDE",      activeLabel: "Writing local-market copy...",        result: "Casual description + pricing",          status: "queued" },
  { id: "meta-ads",    name: "Meta Ad Agent",        phase: 4, type: "CLAUDE",      activeLabel: "Writing 3 ad variants...",            result: "Awareness + Consideration + Conversion",status: "queued" },
  { id: "tiktok",      name: "TikTok Agent",         phase: 4, type: "CLAUDE",      activeLabel: "Writing viral hooks...",              result: "3 hooks + captions + hashtags",          status: "queued" },
  { id: "email",       name: "Email Agent",          phase: 4, type: "CLAUDE",      activeLabel: "Writing launch sequence...",          result: "3-email launch sequence",               status: "queued" },
  { id: "social",      name: "Social Agent",         phase: 4, type: "CLAUDE",      activeLabel: "Building caption bank...",            result: "7-day calendar · 3 platforms",          status: "queued" },
];

const PLATFORMS = [
  { id: "amazon",   label: "Amazon",   color: "#FF9900" },
  { id: "etsy",     label: "Etsy",     color: "#F1641E" },
  { id: "ebay",     label: "eBay",     color: "#E53238" },
  { id: "walmart",  label: "Walmart",  color: "#0071CE" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
];

const MKT_TABS = [
  { id: "meta",   label: "Meta Ads" },
  { id: "tiktok", label: "TikTok"   },
  { id: "email",  label: "Email"    },
  { id: "social", label: "Social"   },
];

// ── Mock output data ──────────────────────────────────────────────────────────

const PRICING = {
  amazon:   { price: 49.99, margin: 34, competitorAvg: 52.40, positioning: "undercut" },
  etsy:     { price: 54.99, margin: 41, competitorAvg: 61.50, positioning: "undercut" },
  ebay:     { price: 44.99, margin: 28, competitorAvg: 41.00, positioning: "match"    },
  walmart:  { price: 47.99, margin: 31, competitorAvg: 32.50, positioning: "premium"  },
  facebook: { price: 42.00, margin: 47, competitorAvg: 38.00, positioning: "match"    },
} as const;

const LISTINGS = {
  amazon: {
    title: "Handmade Sterling Silver Band Ring — Minimalist Artisan Design, Gift for Her, 925 Silver",
    bullets: [
      "PREMIUM 925 STERLING SILVER — Hypoallergenic, tarnish-resistant, comfortable for sensitive skin",
      "HANDCRAFTED ARTISAN QUALITY — Each ring is hand-formed; no two are exactly alike",
      "PERFECT GIFT — Arrives in a premium gift box; ideal for birthdays, anniversaries, or self-gifting",
      "VERSATILE MINIMALIST DESIGN — Stacks beautifully with other rings, suitable for any occasion",
      "SATISFACTION GUARANTEED — 30-day hassle-free returns and lifetime resizing included",
    ],
    keywords: ["sterling silver ring", "handmade jewelry", "artisan ring", "minimalist silver ring", "gift for her", "925 silver band", "boho ring", "statement ring", "silver band ring", "handcrafted ring"],
  },
  etsy: {
    title: "Handmade Silver Ring · Minimalist Band · Gift for Her · Sterling Silver",
    description: "There's something special about wearing a ring that was made entirely by hand — no two are exactly alike.\n\nThis minimalist silver band is hand-formed from genuine 925 sterling silver, polished to a warm luster that catches light just right. Whether you're treating yourself or looking for the perfect gift, this ring carries a quiet story in every curve.\n\nHandmade with care. Ships in a ribbon-tied gift box.",
    tags: ["handmade jewelry", "silver ring", "minimalist ring", "gift for her", "artisan jewelry", "sterling silver", "band ring", "boho jewelry", "dainty ring", "handcrafted", "silver jewelry", "unique gift", "ring for women"],
  },
  ebay: {
    title: "Handmade 925 Sterling Silver Minimalist Band Ring — Brand New, Gift Box Included",
    specs: { Material: "925 Sterling Silver", Style: "Minimalist Band", Finish: "Polished", Occasion: "Everyday / Gift", Packaging: "Gift Box", Handmade: "Yes" },
    recommendation: "BUY NOW recommended — handmade jewelry sells 3× faster with fixed pricing vs. auction.",
  },
  walmart: {
    title: "Handmade 925 Sterling Silver Minimalist Band Ring",
    description: "Material: 925 Sterling Silver. Style: Minimalist band. Finish: High-polish. Occasion: Everyday wear, gifting. Packaging: Gift box included. Care: Wipe with soft cloth; store in dry location. Note: Handmade — minor natural variations per item. Returns accepted within 30 days.",
  },
  facebook: {
    title: "Handmade Silver Ring — $42 · Local Pickup or Shipping",
    description: "Selling handmade sterling silver rings — each one is hand-formed, no two are the same. Great gift or treat yourself. $42 each. Local pickup welcome, or I can ship for $4 flat rate. DM me if you want more photos or have questions!",
  },
};

const MARKETING = {
  meta: [
    { type: "AWARENESS",     headline: "Made by Hand. One at a Time.",       text: "No factory. No mold. Just silver and a craftsperson who cares. See the ring that's never made the same way twice.", cta: "Learn More" },
    { type: "CONSIDERATION", headline: "The Gift They'll Actually Wear",      text: "Handmade 925 sterling silver. Arrives gift-boxed. Hypoallergenic. Lifetime resizing included. Starting at $42.", cta: "Shop Now" },
    { type: "CONVERSION",    headline: "Only 8 Left — Order Today",           text: "Handmade silver rings, each unique. Gift box included. Free resize for life. Ships in 2 days.", cta: "Buy Now" },
  ],
  tiktok: [
    { hook: "POV: you just found the perfect handmade gift under $55 🤍", caption: "handmade sterling silver rings, no two alike — drop a 💍 if you want the link", hashtags: ["#handmadejewelry", "#silverring", "#giftideas", "#etsy", "#smallbusiness"] },
    { hook: "Watch me make a ring from scratch (it takes 45 min) 🔨", caption: "every ring I sell I make by hand — this is how it's done", hashtags: ["#jewelrymaking", "#handmade", "#silversmith", "#craft", "#makersoftiktok"] },
    { hook: "Things that are worth the extra $10 ✨", caption: "handmade > factory made. always.", hashtags: ["#worthit", "#handmadejewelry", "#qualitymatters", "#silverring", "#smallbiz"] },
  ],
  email: [
    { subject: "Welcome — here's the story behind your ring", preview: "Every ring I make starts with a flat piece of silver and ends with something completely one-of-a-kind. Here's how it's made, and why it matters..." },
    { subject: "What makes 925 sterling silver actually different", preview: "You've probably seen \"silver\" rings everywhere. Here's what separates real 925 sterling from the stuff that turns your finger green in a week..." },
    { subject: "48-hour offer: free gift wrapping on any order", preview: "To celebrate our launch, I'm including complimentary gift wrapping on every order placed this week. Here's what that looks like..." },
  ],
  social: [
    { day: "Mon", platform: "Instagram", caption: "Every ring starts as flat silver. Every ring ends as something one-of-a-kind. 🤍 #handmadejewelry #silversmith" },
    { day: "Tue", platform: "Facebook",  caption: "Did you know real 925 sterling silver is hypoallergenic? Perfect for sensitive skin. Shop link in bio." },
    { day: "Wed", platform: "Pinterest", caption: "Minimalist silver band — handmade, gift-boxed, lifetime resize. The ring that goes with everything." },
    { day: "Thu", platform: "Instagram", caption: "Behind the scenes: how I make each ring by hand 👐 No two are the same. That's the point." },
    { day: "Fri", platform: "Facebook",  caption: "Looking for a meaningful gift? Our handmade sterling silver rings arrive in a gift box — ready to give." },
    { day: "Sat", platform: "Instagram", caption: "Weekend restock is live 🌿 New rings, all handmade. Limited quantities — first come, first served." },
    { day: "Sun", platform: "Pinterest", caption: "Gift-ready, hypoallergenic, handmade with love. The collection that started with a single piece of silver." },
  ],
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === "active";
  const isDone = agent.status === "complete";
  const isQueued = agent.status === "queued";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${isActive ? "rgba(240,160,40,0.45)" : isDone ? "rgba(0,232,122,0.35)" : "var(--edge)"}`,
        borderRadius: 8,
        padding: "13px 14px",
        background: isActive ? "rgba(240,160,40,0.06)" : isDone ? "rgba(0,232,122,0.05)" : "var(--surface)",
        transition: "border-color 0.4s, background 0.4s",
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "45%",
            background: "linear-gradient(90deg, transparent, rgba(240,160,40,0.14), transparent)",
            animation: "scanBar 2s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background: isActive ? "var(--amber)" : isDone ? "var(--signal)" : "var(--dim)",
            ...(isActive ? { animation: "pulseLive 1s ease infinite" } : {}),
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            color: isActive ? "var(--amber)" : isDone ? "var(--signal)" : "var(--dim)",
          }}
        >
          {agent.type}
        </span>
        {isDone && agent.elapsed && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              color: "var(--dim)",
              marginLeft: "auto",
            }}
          >
            {agent.elapsed}ms
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: isQueued ? "var(--sub)" : "var(--text)",
          marginBottom: 5,
        }}
      >
        {agent.name}
      </div>

      {isActive && (
        <div
          style={{
            fontSize: 10,
            color: "rgba(240,160,40,0.7)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
          }}
        >
          {agent.activeLabel}
        </div>
      )}
      {isDone && (
        <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)" }}>
          ✓ {agent.result}
        </div>
      )}
    </div>
  );
}

function PhaseLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--sub)", letterSpacing: "0.14em", whiteSpace: "nowrap" }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--edge)" }} />
    </div>
  );
}

function PosBadge({ pos }: { pos: string }) {
  const map: Record<string, [string, string, string]> = {
    undercut: ["UNDERCUT", "var(--amber)", "rgba(240,160,40,0.12)"],
    match:    ["MATCH",    "var(--sky)",   "rgba(85,153,255,0.12)" ],
    premium:  ["PREMIUM",  "var(--signal)","rgba(0,232,122,0.1)"   ],
  };
  const [label, color, bg] = map[pos] ?? map.match;
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        color,
        background: bg,
        border: `1px solid ${color}50`,
        borderRadius: 4,
        padding: "2px 8px",
      }}
    >
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [allComplete, setAllComplete] = useState(false);
  const [platformTab, setPlatformTab] = useState("amazon");
  const [mktTab, setMktTab] = useState("meta");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t0 = Date.now();

    const activate = (ids: string[], delay: number) =>
      timers.push(
        setTimeout(
          () =>
            setAgents((prev) =>
              prev.map((a) => (ids.includes(a.id) ? { ...a, status: "active" as AgentStatus } : a))
            ),
          delay
        )
      );

    const complete = (id: string, delay: number) =>
      timers.push(
        setTimeout(() => {
          const elapsed = Date.now() - t0;
          setAgents((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: "complete" as AgentStatus, elapsed } : a))
          );
        }, delay)
      );

    // Phase 1 — all research fires simultaneously
    activate(["bb-amazon", "bb-etsy", "bb-ebay", "bb-walmart", "bb-facebook"], 350);
    complete("bb-amazon",   1600);
    complete("bb-etsy",     2100);
    complete("bb-ebay",     2500);
    complete("bb-walmart",  2850);
    complete("bb-facebook", 3200);

    // Phase 2 — pricing
    activate(["pricing"], 3400);
    complete("pricing", 4900);

    // Phase 3 + 4 — listings + marketing in parallel
    activate(["lst-amazon", "lst-etsy", "lst-ebay", "lst-walmart", "lst-facebook"], 5100);
    activate(["meta-ads", "tiktok", "email", "social"], 5300);

    complete("lst-amazon",  6400);
    complete("meta-ads",    6600);
    complete("lst-etsy",    6900);
    complete("tiktok",      7100);
    complete("lst-ebay",    7350);
    complete("email",       7550);
    complete("lst-walmart", 7750);
    complete("social",      7950);
    complete("lst-facebook",8150);

    timers.push(setTimeout(() => setAllComplete(true), 8450));

    return () => timers.forEach(clearTimeout);
  }, []);

  const byPhase = (p: number) => agents.filter((a) => a.phase === p);
  const p = PRICING[platformTab as keyof typeof PRICING];

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--edge)",
          background: "var(--void)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
          className="flex items-center justify-between h-14"
        >
          <div className="flex items-center gap-4">
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", color: "var(--amber)" }}>
                SWARMSELL
              </span>
            </Link>
            <span style={{ color: "var(--rim)" }}>›</span>
            {allComplete ? (
              <div className="flex items-center gap-2">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--signal)" }} />
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--signal)", letterSpacing: "0.1em" }}>
                  SWARMSELL COMPLETE
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--amber)",
                    animation: "pulseLive 1s ease infinite",
                  }}
                />
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.1em" }}>
                  SWARM ACTIVE
                </span>
              </div>
            )}
          </div>
          <Link
            href="/"
            style={{
              fontSize: 12,
              color: "var(--sub)",
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              border: "1px solid var(--edge)",
              borderRadius: 6,
              padding: "6px 14px",
            }}
          >
            ← NEW PRODUCT
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 80px" }}>
        {/* ─── AGENT PIPELINE ──────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          {/* Phase 1 */}
          <div style={{ marginBottom: 12 }}>
            <PhaseLabel>PHASE 1 · BROWSERBASE MARKET RESEARCH</PhaseLabel>
            <div className="grid grid-cols-5 gap-3">
              {byPhase(1).map((a) => <AgentCard key={a.id} agent={a} />)}
            </div>
          </div>

          <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 18, margin: "6px 0" }}>↓</div>

          {/* Phase 2 */}
          <div style={{ marginBottom: 12 }}>
            <PhaseLabel>PHASE 2 · PRICING INTELLIGENCE</PhaseLabel>
            <div style={{ maxWidth: 360 }}>
              {byPhase(2).map((a) => <AgentCard key={a.id} agent={a} />)}
            </div>
          </div>

          <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 18, margin: "6px 0" }}>↓</div>

          {/* Phase 3 + 4 */}
          <div>
            <PhaseLabel>PHASE 3 · CONTENT GENERATION (PARALLEL)</PhaseLabel>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 10 }}>
                  MARKETPLACE LISTINGS
                </div>
                <div className="flex flex-col gap-3">
                  {byPhase(3).map((a) => <AgentCard key={a.id} agent={a} />)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 10 }}>
                  MARKETING AGENTS
                </div>
                <div className="flex flex-col gap-3">
                  {byPhase(4).map((a) => <AgentCard key={a.id} agent={a} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── COMPLETION BANNER ───────────────────────────── */}
        {allComplete && (
          <div
            style={{
              border: "1px solid rgba(0,232,122,0.35)",
              borderRadius: 10,
              background: "rgba(0,232,122,0.05)",
              padding: "20px 28px",
              marginBottom: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              animation: "slideDown 0.5s ease both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--signal)", marginBottom: 3 }}>
                  SwarmSell Complete
                </div>
                <div style={{ fontSize: 13, color: "var(--sub)" }}>
                  15 agents · live Browserbase data from 5 platforms · all listings & marketing ready
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                ~8s
              </div>
              <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                TOTAL TIME
              </div>
            </div>
          </div>
        )}

        {/* ─── OUTPUT ──────────────────────────────────────── */}
        {allComplete && (
          <div style={{ animation: "fadeUp 0.6s ease both" }}>
            {/* Platform tabs */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MARKETPLACE LISTINGS
              </div>
              <div className="flex gap-1" style={{ borderBottom: "1px solid var(--edge)", marginBottom: 0 }}>
                {PLATFORMS.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setPlatformTab(pl.id)}
                    style={{
                      padding: "9px 20px",
                      border: "none",
                      background: platformTab === pl.id ? "var(--surface)" : "transparent",
                      color: platformTab === pl.id ? pl.color : "var(--sub)",
                      fontSize: 13,
                      fontWeight: platformTab === pl.id ? 600 : 400,
                      cursor: "pointer",
                      borderBottom: platformTab === pl.id ? `2px solid ${pl.color}` : "2px solid transparent",
                      borderRadius: "6px 6px 0 0",
                      transition: "all 0.2s",
                      fontFamily: "inherit",
                    }}
                  >
                    {pl.label}
                  </button>
                ))}
              </div>

              {/* Platform card */}
              <div
                style={{
                  border: "1px solid var(--edge)",
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  background: "var(--panel)",
                  overflow: "hidden",
                }}
              >
                {/* Pricing bar */}
                <div
                  style={{
                    borderBottom: "1px solid var(--edge)",
                    padding: "16px 24px",
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div className="flex items-center gap-8">
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 2 }}>RECOMMENDED PRICE</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                        ${p.price.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 36, background: "var(--edge)" }} />
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 2 }}>COMPETITOR AVG</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--dim)" }}>
                        ${p.competitorAvg.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 36, background: "var(--edge)" }} />
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 2 }}>MARGIN AFTER FEES</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--signal)" }}>
                        {p.margin}%
                      </div>
                    </div>
                  </div>
                  <PosBadge pos={p.positioning} />
                </div>

                {/* Listing body */}
                <div style={{ padding: "24px" }}>
                  {platformTab === "amazon" && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20, lineHeight: 1.5 }}>
                        {LISTINGS.amazon.title}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>BULLET POINTS</div>
                      <div className="flex flex-col gap-2" style={{ marginBottom: 20 }}>
                        {LISTINGS.amazon.bullets.map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>
                            <span style={{ color: "var(--amber)", fontWeight: 700, flexShrink: 0 }}>•</span>
                            {b}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>BACKEND KEYWORDS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {LISTINGS.amazon.keywords.map((k) => (
                          <span key={k} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 4, padding: "3px 8px" }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {platformTab === "etsy" && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{LISTINGS.etsy.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.75, marginBottom: 20, whiteSpace: "pre-line", background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "14px 16px" }}>{LISTINGS.etsy.description}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>TAGS (13 / 13)</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {LISTINGS.etsy.tags.map((t) => (
                          <span key={t} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#F1641E", background: "rgba(241,100,30,0.1)", border: "1px solid rgba(241,100,30,0.3)", borderRadius: 4, padding: "3px 8px" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {platformTab === "ebay" && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{LISTINGS.ebay.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>ITEM SPECIFICS</div>
                      <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
                        {Object.entries(LISTINGS.ebay.specs).map(([k, v]) => (
                          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "10px 14px" }}>
                            <div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 4 }}>{k.toUpperCase()}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: "rgba(229,50,56,0.08)", border: "1px solid rgba(229,50,56,0.25)", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#E53238" }}>
                        ⚡ {LISTINGS.ebay.recommendation}
                      </div>
                    </div>
                  )}
                  {platformTab === "walmart" && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{LISTINGS.walmart.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "14px 16px" }}>{LISTINGS.walmart.description}</div>
                    </div>
                  )}
                  {platformTab === "facebook" && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{LISTINGS.facebook.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "14px 16px" }}>{LISTINGS.facebook.description}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Marketing tabs */}
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MARKETING ASSETS
              </div>
              <div className="flex gap-1" style={{ borderBottom: "1px solid var(--edge)" }}>
                {MKT_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMktTab(t.id)}
                    style={{
                      padding: "9px 20px",
                      border: "none",
                      background: mktTab === t.id ? "var(--surface)" : "transparent",
                      color: mktTab === t.id ? "var(--text)" : "var(--sub)",
                      fontSize: 13,
                      fontWeight: mktTab === t.id ? 600 : 400,
                      cursor: "pointer",
                      borderBottom: mktTab === t.id ? "2px solid var(--amber)" : "2px solid transparent",
                      borderRadius: "6px 6px 0 0",
                      transition: "all 0.2s",
                      fontFamily: "inherit",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  border: "1px solid var(--edge)",
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  background: "var(--panel)",
                  padding: 24,
                }}
              >
                {mktTab === "meta" && (
                  <div className="grid grid-cols-3 gap-4">
                    {MARKETING.meta.map((ad) => (
                      <div key={ad.type} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 16, background: "var(--surface)" }}>
                        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.14em", marginBottom: 10 }}>{ad.type}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>{ad.headline}</div>
                        <div style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.65, marginBottom: 14 }}>{ad.text}</div>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sky)", background: "rgba(85,153,255,0.1)", border: "1px solid rgba(85,153,255,0.25)", borderRadius: 4, padding: "4px 10px" }}>{ad.cta}</span>
                      </div>
                    ))}
                  </div>
                )}
                {mktTab === "tiktok" && (
                  <div className="flex flex-col gap-4">
                    {MARKETING.tiktok.map((v, i) => (
                      <div key={i} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 16, background: "var(--surface)", display: "flex", gap: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--sub)", flexShrink: 0, paddingTop: 2 }}>HOOK {i + 1}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>"{v.hook}"</div>
                          <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 10 }}>{v.caption}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {v.hashtags.map((h) => (
                              <span key={h} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sky)" }}>{h}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mktTab === "email" && (
                  <div className="flex flex-col gap-4">
                    {MARKETING.email.map((e, i) => (
                      <div key={i} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 16, background: "var(--surface)", display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(240,160,40,0.15)", border: "1px solid rgba(240,160,40,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>📧 {e.subject}</div>
                          <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.6 }}>{e.preview}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mktTab === "social" && (
                  <div className="grid grid-cols-7 gap-3">
                    {MARKETING.social.map((s, i) => (
                      <div key={i} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 12, background: "var(--surface)" }}>
                        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.1em", marginBottom: 2 }}>{s.day.toUpperCase()}</div>
                        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--sub)", marginBottom: 8 }}>{s.platform}</div>
                        <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.55 }}>{s.caption}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Waiting state */}
        {!allComplete && (
          <div
            style={{
              border: "1px solid var(--edge)",
              borderRadius: 10,
              padding: "56px 32px",
              textAlign: "center",
              background: "var(--panel)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "2px solid var(--rim)",
                borderTopColor: "var(--amber)",
                animation: "spin 0.9s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Swarm running...
            </div>
            <div style={{ fontSize: 13, color: "var(--sub)" }}>
              Listings and marketing assets will appear here once all agents complete
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
