"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  runSwarm,
  runMarketingAgents,
  type LaunchKit,
  type MarketingOutputs,
  type Platform,
  type ProductInput,
} from "@/lib/swarm";
import {
  BrowserLiveGrid,
  ContinueBanner,
  MarketDataResults,
  PricingResults,
  SectionShell,
  type LiveBrowserSession,
  type PausedStage,
} from "./stage-panels";

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
  { id: "bb-amazon",    name: "Amazon Research",      phase: 1, type: "BROWSERBASE", activeLabel: "Scraping competitor prices...",      result: "Analyzing live listings",                status: "queued" },
  { id: "bb-etsy",      name: "Etsy Research",        phase: 1, type: "BROWSERBASE", activeLabel: "Scraping competitor prices...",      result: "Analyzing live listings",                status: "queued" },
  { id: "bb-ebay",      name: "eBay Research",        phase: 1, type: "BROWSERBASE", activeLabel: "Scraping sold listings...",          result: "Analyzing sold prices",                  status: "queued" },
  { id: "bb-walmart",   name: "Walmart Research",     phase: 1, type: "BROWSERBASE", activeLabel: "Scraping shelf prices...",           result: "Analyzing shelf prices",                 status: "queued" },
  { id: "bb-facebook",  name: "Facebook Research",    phase: 1, type: "BROWSERBASE", activeLabel: "Scraping local listings...",         result: "Analyzing local market",                 status: "queued" },
  { id: "pricing",      name: "Pricing Intelligence", phase: 2, type: "CLAUDE",      activeLabel: "Analyzing market data + fees...",    result: "Optimal prices computed",                status: "queued" },
  { id: "lst-amazon",   name: "Amazon Listing",       phase: 3, type: "CLAUDE",      activeLabel: "Writing A9-optimized listing...",    result: "Title + 5 bullets + 10 keywords",        status: "queued" },
  { id: "lst-etsy",     name: "Etsy Listing",         phase: 3, type: "CLAUDE",      activeLabel: "Writing story-driven copy...",       result: "Title + description + 13 tags",          status: "queued" },
  { id: "lst-ebay",     name: "eBay Listing",         phase: 3, type: "CLAUDE",      activeLabel: "Writing spec-heavy listing...",      result: "Title + specs + format rec",             status: "queued" },
  { id: "lst-walmart",  name: "Walmart Listing",      phase: 3, type: "CLAUDE",      activeLabel: "Writing taxonomy-compliant copy...", result: "Title + spec description",               status: "queued" },
  { id: "lst-facebook", name: "Facebook Listing",     phase: 3, type: "CLAUDE",      activeLabel: "Writing local-market copy...",       result: "Casual description + pricing",           status: "queued" },
  { id: "meta-ads",     name: "Meta Ad Agent",        phase: 4, type: "CLAUDE",      activeLabel: "Writing 3 ad variants...",           result: "Awareness + Consideration + Conversion", status: "queued" },
  { id: "tiktok",       name: "TikTok Agent",         phase: 4, type: "CLAUDE",      activeLabel: "Writing viral hooks...",             result: "3 scripts + captions + hashtags",        status: "queued" },
  { id: "email",        name: "Email Agent",          phase: 4, type: "CLAUDE",      activeLabel: "Writing launch sequence...",         result: "3-email launch sequence",                status: "queued" },
  { id: "social",       name: "Social Agent",         phase: 4, type: "CLAUDE",      activeLabel: "Building caption bank...",           result: "7-day calendar · 3 platforms",           status: "queued" },
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

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === "active";
  const isDone   = agent.status === "complete";
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
            position: "absolute", top: 0, bottom: 0, width: "45%",
            background: "linear-gradient(90deg, transparent, rgba(240,160,40,0.14), transparent)",
            animation: "scanBar 2s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <div
          style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: isActive ? "var(--amber)" : isDone ? "var(--signal)" : "var(--dim)",
            ...(isActive ? { animation: "pulseLive 1s ease infinite" } : {}),
          }}
        />
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", color: isActive ? "var(--amber)" : isDone ? "var(--signal)" : "var(--dim)" }}>
          {agent.type}
        </span>
        {isDone && agent.elapsed && (
          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--dim)", marginLeft: "auto" }}>
            {agent.elapsed}ms
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isQueued ? "var(--sub)" : "var(--text)", marginBottom: 5 }}>
        {agent.name}
      </div>
      {isActive && (
        <div style={{ fontSize: 10, color: "rgba(240,160,40,0.7)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
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
    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color, background: bg, border: `1px solid ${color}50`, borderRadius: 4, padding: "2px 8px" }}>
      {label}
    </span>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [agents, setAgents]           = useState<Agent[]>(INITIAL_AGENTS);
  const [allComplete, setAllComplete] = useState(false);
  const [platformTab, setPlatformTab] = useState("amazon");
  const [mktTab, setMktTab]           = useState("meta");
  const [kit, setKit]                 = useState<LaunchKit | null>(null);
  const [marketing, setMarketing]     = useState<MarketingOutputs | null>(null);
  const [swarmError, setSwarmError]   = useState<string | null>(null);
  const [totalTime, setTotalTime]     = useState(0);
  const [pausedAt, setPausedAt]       = useState<PausedStage | null>(null);
  const [liveBrowsers, setLiveBrowsers] = useState<Partial<Record<Platform, LiveBrowserSession>>>({});
  const [researchPlatforms, setResearchPlatforms] = useState<Platform[]>([]);
  const continueRef                   = useRef<(() => void) | null>(null);

  const handleContinue = useCallback(() => {
    setPausedAt(null);
    continueRef.current?.();
    continueRef.current = null;
  }, []);

  const waitForContinue = useCallback(
    (stage: PausedStage) =>
      new Promise<void>((resolve) => {
        setPausedAt(stage);
        continueRef.current = resolve;
      }),
    []
  );

  useEffect(() => {
    const t0 = Date.now();
    let cancelled = false;

    const activate = (ids: string[]) =>
      setAgents((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, status: "active" as AgentStatus } : a));

    const completeAgents = (ids: string[]) => {
      const elapsed = Date.now() - t0;
      setAgents((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, status: "complete" as AgentStatus, elapsed } : a));
    };

    const updateBbResults = (marketData: LaunchKit["marketData"]) => {
      setAgents((prev) =>
        prev.map((a) => {
          if (a.phase !== 1) return a;
          const key = a.id.replace("bb-", "") as Platform;
          const md = marketData[key];
          const avg = md?.avgPrice ?? md?.avgSoldPrice;
          return {
            ...a,
            result:
              avg != null
                ? `avg $${avg.toFixed(2)} · ${md?.topKeywords?.length ?? md?.topTags?.length ?? 0} keywords`
                : "no data retrieved",
          };
        })
      );
    };

    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(localStorage.getItem("swarmsell-product") ?? "{}"); } catch { /* ignore */ }

    const product: ProductInput = {
      name:         (raw.name as string)     || "My Product",
      category:     (raw.category as string) || "General",
      description:  raw.description as string | undefined,
      cost:         raw.cost ? Number(raw.cost) : undefined,
      targetMargin: raw.margin ? Number(raw.margin) : undefined,
      images:       (raw.images as string[]) ?? [],
    };
    const platforms: Platform[] =
      Array.isArray(raw.platforms) && raw.platforms.length > 0
        ? (raw.platforms as Platform[])
        : ["amazon", "etsy", "ebay", "walmart", "facebook"];

    setResearchPlatforms(platforms);

    const bbIds = platforms.map((p) => `bb-${p}`);
    const listingIds = platforms.map((p) => `lst-${p}`);

    async function runWorkflow() {
      activate(bbIds);

      try {
        const completedKit = await runSwarm(product, platforms, async (event) => {
          if (event.browserSession) {
            const { platform, debugUrl, sessionUrl } = event.browserSession;
            setLiveBrowsers((prev) => ({
              ...prev,
              [platform]: { debugUrl, sessionUrl, status: "live" },
            }));
            return;
          }

          if (event.browserClosed) {
            const platform = event.browserClosed;
            setLiveBrowsers((prev) => {
              const current = prev[platform];
              if (!current) return prev;
              return { ...prev, [platform]: { ...current, status: "done" } };
            });
            return;
          }

          if (!event.snapshot) return;

          if (event.phase === "pricing") {
            completeAgents(bbIds);
            updateBbResults(event.snapshot.marketData);
            setKit(event.snapshot);
            await waitForContinue("research");
            if (cancelled) return;
            activate(["pricing"]);
          } else if (event.phase === "listings") {
            completeAgents(["pricing"]);
            setKit(event.snapshot);
            await waitForContinue("pricing");
            if (cancelled) return;
            activate(listingIds);
          } else if (event.phase === "complete") {
            completeAgents(listingIds);
            setKit(event.snapshot);
            const firstListing = platforms.find((p) => event.snapshot!.listings[p] != null);
            if (firstListing) setPlatformTab(firstListing);
            await waitForContinue("listings");
          }
        });

        if (cancelled) return;

        activate(["meta-ads", "tiktok", "email", "social"]);
        const { outputs } = await runMarketingAgents(completedKit);
        if (cancelled) return;

        setKit(completedKit);
        setMarketing(outputs);
        completeAgents(["meta-ads", "tiktok", "email", "social"]);

        const firstMkt = (["meta", "tiktok", "email", "social"] as const).find((k) => outputs[k] != null);
        if (firstMkt) setMktTab(firstMkt);

        setTotalTime(Math.round((Date.now() - t0) / 1000));
        await waitForContinue("marketing");
        if (cancelled) return;
        setAllComplete(true);
      } catch (err: unknown) {
        console.error("[dashboard] swarm failed:", err);
        setSwarmError(err instanceof Error ? err.message : String(err));
        setAllComplete(true);
      }
    }

    runWorkflow();
    return () => { cancelled = true; };
  }, [waitForContinue]);

  const byPhase      = (ph: number) => agents.filter((a) => a.phase === ph);
  const pricingEntry = kit?.pricing?.[platformTab as Platform];
  const hasListings  =
    kit != null && PLATFORMS.some((pl) => kit.listings[pl.id as Platform] != null);
  const hasPricing   =
    kit?.pricing != null && Object.keys(kit.pricing).length > 0;
  const showMarket   = kit != null;

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: "1px solid var(--edge)", background: "var(--void)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }} className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", color: "var(--amber)" }}>SWARMSELL</span>
            </Link>
            <span style={{ color: "var(--rim)" }}>›</span>
            {allComplete ? (
              <div className="flex items-center gap-2">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--signal)" }} />
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--signal)", letterSpacing: "0.1em" }}>SWARMSELL COMPLETE</span>
              </div>
            ) : pausedAt ? (
              <div className="flex items-center gap-2">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)" }} />
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.1em" }}>PAUSED — REVIEW RESULTS</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", animation: "pulseLive 1s ease infinite" }} />
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.1em" }}>SWARM ACTIVE</span>
              </div>
            )}
          </div>
          <Link href="/" style={{ fontSize: 12, color: "var(--sub)", textDecoration: "none", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", border: "1px solid var(--edge)", borderRadius: 6, padding: "6px 14px" }}>
            ← NEW PRODUCT
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 80px" }}>
        {/* ─── AGENT PIPELINE ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 12 }}>
            <PhaseLabel>PHASE 1 · BROWSERBASE MARKET RESEARCH</PhaseLabel>
            <div className="grid grid-cols-5 gap-3">
              {byPhase(1).map((a) => <AgentCard key={a.id} agent={a} />)}
            </div>
            <BrowserLiveGrid sessions={liveBrowsers} platformOrder={researchPlatforms} />
          </div>
          <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 18, margin: "6px 0" }}>↓</div>
          <div style={{ marginBottom: 12 }}>
            <PhaseLabel>PHASE 2 · PRICING INTELLIGENCE</PhaseLabel>
            <div style={{ maxWidth: 360 }}>
              {byPhase(2).map((a) => <AgentCard key={a.id} agent={a} />)}
            </div>
          </div>
          <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 18, margin: "6px 0" }}>↓</div>
          <div>
            <PhaseLabel>PHASE 3 · CONTENT GENERATION (PARALLEL)</PhaseLabel>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 10 }}>MARKETPLACE LISTINGS</div>
                <div className="flex flex-col gap-3">{byPhase(3).map((a) => <AgentCard key={a.id} agent={a} />)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 10 }}>MARKETING AGENTS</div>
                <div className="flex flex-col gap-3">{byPhase(4).map((a) => <AgentCard key={a.id} agent={a} />)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── ERROR BANNER ────────────────────────────────────────────────── */}
        {swarmError && (
          <div style={{ border: "1px solid rgba(229,50,56,0.4)", borderRadius: 10, background: "rgba(229,50,56,0.07)", padding: "16px 24px", marginBottom: 24, fontSize: 13, color: "#E53238", fontFamily: "var(--font-mono)" }}>
            ⚠ Swarm error: {swarmError}
          </div>
        )}

        {/* ─── COMPLETION BANNER ───────────────────────────────────────────── */}
        {allComplete && !swarmError && (
          <div
            style={{
              border: "1px solid rgba(0,232,122,0.35)", borderRadius: 10, background: "rgba(0,232,122,0.05)",
              padding: "20px 28px", marginBottom: 40,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              animation: "slideDown 0.5s ease both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--signal)", marginBottom: 3 }}>SwarmSell Complete</div>
                <div style={{ fontSize: 13, color: "var(--sub)" }}>
                  15 agents · live Browserbase data from 5 platforms · all listings & marketing ready
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                {totalTime > 0 ? `${totalTime}s` : "—"}
              </div>
              <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>TOTAL TIME</div>
            </div>
          </div>
        )}

        {pausedAt && (
          <ContinueBanner stage={pausedAt} onContinue={handleContinue} />
        )}

        {showMarket && kit && (
          <SectionShell title="PHASE 1 · LIVE MARKET RESEARCH">
            <MarketDataResults marketData={kit.marketData} />
          </SectionShell>
        )}

        {hasPricing && kit && (
          <SectionShell title="PHASE 2 · PRICING INTELLIGENCE">
            <PricingResults pricing={kit.pricing} />
          </SectionShell>
        )}

        {/* ─── LISTINGS + MARKETING OUTPUT ─────────────────────────────────── */}
        {kit && (hasListings || marketing) && (
          <div style={{ animation: "fadeUp 0.6s ease both" }}>
            {hasListings && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MARKETPLACE LISTINGS
              </div>
              <div className="flex gap-1" style={{ borderBottom: "1px solid var(--edge)" }}>
                {PLATFORMS.filter((pl) => kit.listings[pl.id as Platform] != null).map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setPlatformTab(pl.id)}
                    style={{
                      padding: "9px 20px", border: "none",
                      background: platformTab === pl.id ? "var(--surface)" : "transparent",
                      color: platformTab === pl.id ? pl.color : "var(--sub)",
                      fontSize: 13, fontWeight: platformTab === pl.id ? 600 : 400,
                      cursor: "pointer",
                      borderBottom: platformTab === pl.id ? `2px solid ${pl.color}` : "2px solid transparent",
                      borderRadius: "6px 6px 0 0", transition: "all 0.2s", fontFamily: "inherit",
                    }}
                  >
                    {pl.label}
                  </button>
                ))}
              </div>

              <div style={{ border: "1px solid var(--edge)", borderTop: "none", borderRadius: "0 0 10px 10px", background: "var(--panel)", overflow: "hidden" }}>
                {/* Pricing bar */}
                <div style={{ borderBottom: "1px solid var(--edge)", padding: "16px 24px", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="flex items-center gap-8">
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 2 }}>RECOMMENDED PRICE</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                        {pricingEntry ? `$${pricingEntry.price.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 36, background: "var(--edge)" }} />
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 2 }}>COMPETITOR AVG</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--dim)" }}>
                        {pricingEntry ? `$${pricingEntry.competitorAvg.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 36, background: "var(--edge)" }} />
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 2 }}>MARGIN AFTER FEES</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--signal)" }}>
                        {pricingEntry ? `${pricingEntry.margin}%` : "—"}
                      </div>
                    </div>
                  </div>
                  {pricingEntry && <PosBadge pos={pricingEntry.positioning} />}
                </div>

                {/* Listing body */}
                <div style={{ padding: 24 }}>
                  {platformTab === "amazon" && kit.listings.amazon && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20, lineHeight: 1.5 }}>{kit.listings.amazon.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>BULLET POINTS</div>
                      <div className="flex flex-col gap-2" style={{ marginBottom: 20 }}>
                        {kit.listings.amazon.bullets.map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>
                            <span style={{ color: "var(--amber)", fontWeight: 700, flexShrink: 0 }}>•</span>{b}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>BACKEND KEYWORDS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {kit.listings.amazon.keywords.map((k) => (
                          <span key={k} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 4, padding: "3px 8px" }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {platformTab === "etsy" && kit.listings.etsy && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{kit.listings.etsy.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.75, marginBottom: 20, whiteSpace: "pre-line", background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "14px 16px" }}>{kit.listings.etsy.description}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>TAGS ({kit.listings.etsy.tags.length} / 13)</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {kit.listings.etsy.tags.map((t) => (
                          <span key={t} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#F1641E", background: "rgba(241,100,30,0.1)", border: "1px solid rgba(241,100,30,0.3)", borderRadius: 4, padding: "3px 8px" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {platformTab === "ebay" && kit.listings.ebay && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{kit.listings.ebay.title}</div>
                      {kit.listings.ebay.condition && (
                        <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 20 }}>Condition: {kit.listings.ebay.condition}</div>
                      )}
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>ITEM SPECIFICS</div>
                      <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
                        {Object.entries(kit.listings.ebay.specs).map(([k, v]) => (
                          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "10px 14px" }}>
                            <div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 4 }}>{k.toUpperCase()}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {(kit.listings.ebay.format || kit.listings.ebay.rationale) && (
                        <div style={{ background: "rgba(229,50,56,0.08)", border: "1px solid rgba(229,50,56,0.25)", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#E53238" }}>
                          ⚡ {kit.listings.ebay.format?.toUpperCase() ?? "FORMAT"} recommended — {kit.listings.ebay.rationale}
                        </div>
                      )}
                    </div>
                  )}
                  {platformTab === "walmart" && kit.listings.walmart && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{kit.listings.walmart.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "14px 16px", marginBottom: kit.listings.walmart.specs ? 20 : 0 }}>{kit.listings.walmart.description}</div>
                      {kit.listings.walmart.specs && (
                        <>
                          <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 10 }}>ITEM SPECS</div>
                          <div className="grid grid-cols-3 gap-3">
                            {Object.entries(kit.listings.walmart.specs).map(([k, v]) => (
                              <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "10px 14px" }}>
                                <div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 4 }}>{k.toUpperCase()}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {platformTab === "facebook" && kit.listings.facebook && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>TITLE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>{kit.listings.facebook.title}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 8 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: 6, padding: "14px 16px" }}>{kit.listings.facebook.description}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* ── Marketing tabs ── */}
            {marketing && (
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", letterSpacing: "0.14em", marginBottom: 12 }}>
                  MARKETING ASSETS
                </div>
                <div className="flex gap-1" style={{ borderBottom: "1px solid var(--edge)" }}>
                  {MKT_TABS.filter((t) => marketing[t.id as keyof MarketingOutputs] != null).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMktTab(t.id)}
                      style={{
                        padding: "9px 20px", border: "none",
                        background: mktTab === t.id ? "var(--surface)" : "transparent",
                        color: mktTab === t.id ? "var(--text)" : "var(--sub)",
                        fontSize: 13, fontWeight: mktTab === t.id ? 600 : 400, cursor: "pointer",
                        borderBottom: mktTab === t.id ? "2px solid var(--amber)" : "2px solid transparent",
                        borderRadius: "6px 6px 0 0", transition: "all 0.2s", fontFamily: "inherit",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ border: "1px solid var(--edge)", borderTop: "none", borderRadius: "0 0 10px 10px", background: "var(--panel)", padding: 24 }}>
                  {mktTab === "meta" && marketing.meta && (
                    <div className="grid grid-cols-3 gap-4">
                      {marketing.meta.variants.map((ad) => (
                        <div key={ad.type} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 16, background: "var(--surface)" }}>
                          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.14em", marginBottom: 10 }}>{ad.type.toUpperCase()}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>{ad.headline}</div>
                          <div style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.65, marginBottom: 14 }}>{ad.primaryText}</div>
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sky)", background: "rgba(85,153,255,0.1)", border: "1px solid rgba(85,153,255,0.25)", borderRadius: 4, padding: "4px 10px" }}>{ad.cta}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {mktTab === "tiktok" && marketing.tiktok && (
                    <div className="flex flex-col gap-4">
                      {marketing.tiktok.scripts.map((v, i) => (
                        <div key={i} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 16, background: "var(--surface)" }}>
                          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--sub)", marginBottom: 8 }}>HOOK {i + 1}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>"{v.hook}"</div>
                          {v.body && <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, marginBottom: 10 }}>{v.body}</div>}
                          <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 10 }}>{v.caption}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {v.hashtags.map((h) => (
                              <span key={h} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sky)" }}>{h}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {mktTab === "email" && marketing.email && (
                    <div className="flex flex-col gap-4">
                      {marketing.email.emails.map((e, i) => (
                        <div key={i} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 16, background: "var(--surface)", display: "flex", gap: 16, alignItems: "flex-start" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(240,160,40,0.15)", border: "1px solid rgba(240,160,40,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            {e.stage && <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--dim)", letterSpacing: "0.1em", marginBottom: 4 }}>{e.stage.toUpperCase()}</div>}
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>📧 {e.subject}</div>
                            <div style={{ fontSize: 12, color: "var(--sub)", fontStyle: "italic", marginBottom: e.body ? 10 : 0 }}>{e.preheader}</div>
                            {e.body && (
                              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, background: "var(--void)", border: "1px solid var(--edge)", borderRadius: 6, padding: "12px 14px", whiteSpace: "pre-line" }}>
                                {e.body}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {mktTab === "social" && marketing.social && (
                    <div className="grid grid-cols-7 gap-3">
                      {marketing.social.days.map((dayData) => (
                        <div key={dayData.day} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.1em" }}>DAY {dayData.day}</div>
                          {dayData.posts.map((post, pi) => (
                            <div key={pi} style={{ border: "1px solid var(--edge)", borderRadius: 8, padding: 10, background: "var(--surface)" }}>
                              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--sub)", marginBottom: 6, textTransform: "capitalize" }}>{post.channel}</div>
                              <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.55, marginBottom: 6 }}>{post.caption}</div>
                              <div style={{ fontSize: 9, color: "var(--sky)", fontFamily: "var(--font-mono)", wordBreak: "break-word" }}>
                                {post.hashtags.slice(0, 3).join(" ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── WAITING STATE ───────────────────────────────────────────────── */}
        {!kit && !pausedAt && !allComplete && !swarmError && (
          <div style={{ border: "1px solid var(--edge)", borderRadius: 10, padding: "56px 32px", textAlign: "center", background: "var(--panel)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--rim)", borderTopColor: "var(--amber)", animation: "spin 0.9s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Swarm running...</div>
            <div style={{ fontSize: 13, color: "var(--sub)" }}>
              Phase 1 · scraping live competitor prices from your selected platforms
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
