import type { MarketData, Platform, Pricing } from "@/lib/swarm";

const PLATFORMS = [
  { id: "amazon", label: "Amazon", color: "#FF9900" },
  { id: "etsy", label: "Etsy", color: "#F1641E" },
  { id: "ebay", label: "eBay", color: "#E53238" },
  { id: "walmart", label: "Walmart", color: "#0071CE" },
] as const;

export type PausedStage = "research" | "pricing" | "listings" | "marketing";

export const STAGE_CONTINUE: Record<PausedStage, string> = {
  research: "Continue to Pricing →",
  pricing: "Continue to Listings →",
  listings: "Continue to Marketing →",
  marketing: "View Full Kit →",
};

function PosBadge({ pos }: { pos: string }) {
  const map: Record<string, [string, string, string]> = {
    undercut: ["UNDERCUT", "var(--amber)", "rgba(240,160,40,0.12)"],
    match: ["MATCH", "var(--sky)", "rgba(85,153,255,0.12)"],
    premium: ["PREMIUM", "var(--signal)", "rgba(0,232,122,0.1)"],
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

export function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32, animation: "fadeUp 0.5s ease both" }}>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sub)", letterSpacing: "0.14em", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ border: "1px solid var(--edge)", borderRadius: 10, background: "var(--panel)", padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

export type LiveBrowserSession = {
  debugUrl: string;
  sessionUrl?: string;
  status: "live" | "done";
};

export function BrowserLiveGrid({
  sessions,
  platformOrder,
}: {
  sessions: Partial<Record<Platform, LiveBrowserSession>>;
  platformOrder: Platform[];
}) {
  const visible = platformOrder.filter((p) => sessions[p]);
  if (visible.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.12em", marginBottom: 10 }}>
        LIVE BROWSER SESSIONS · BROWSERBASE
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {visible.map((platformId) => {
          const pl = PLATFORMS.find((x) => x.id === platformId)!;
          const session = sessions[platformId]!;
          const isLive = session.status === "live";
          return (
            <div
              key={platformId}
              style={{
                border: `1px solid ${isLive ? pl.color + "55" : "var(--edge)"}`,
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--edge)",
                  background: `${pl.color}10`,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: pl.color }}>{pl.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    color: isLive ? "var(--amber)" : "var(--signal)",
                    ...(isLive ? { animation: "pulseLive 1s ease infinite" } : {}),
                  }}
                >
                  {isLive ? "● LIVE" : "✓ DONE"}
                </span>
              </div>
              {isLive ? (
                <iframe
                  src={session.debugUrl}
                  title={`${pl.label} live browser`}
                  style={{ width: "100%", height: 220, border: "none", background: "#111" }}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                    textAlign: "center",
                    background: "#111",
                  }}
                >
                  <p style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
                    Session ended — scrape complete.
                    <br />
                    Live debugger disconnects when the browser closes.
                  </p>
                </div>
              )}
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--edge)" }}>
                {isLive ? (
                  <a
                    href={session.debugUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "var(--sky)", fontFamily: "var(--font-mono)" }}
                  >
                    Open live debugger ↗
                  </a>
                ) : session.sessionUrl ? (
                  <a
                    href={session.sessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--font-mono)" }}
                  >
                    View session replay on Browserbase ↗
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContinueBanner({
  stage,
  onContinue,
}: {
  stage: PausedStage;
  onContinue: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(240,160,40,0.4)",
        borderRadius: 10,
        background: "rgba(240,160,40,0.08)",
        padding: "20px 24px",
        marginBottom: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        animation: "fadeUp 0.4s ease both",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)", marginBottom: 4 }}>
          Stage complete — review results below
        </div>
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          Continue when ready to run the next phase of the swarm.
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        style={{
          flexShrink: 0,
          padding: "12px 24px",
          borderRadius: 8,
          border: "none",
          background: "var(--amber)",
          color: "#07070C",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {STAGE_CONTINUE[stage]}
      </button>
    </div>
  );
}

export function MarketDataResults({ marketData }: { marketData: MarketData }) {
  const entries = PLATFORMS.filter((pl) => marketData[pl.id as Platform]);
  if (entries.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--sub)" }}>
        No live competitor data returned — pricing will use model knowledge.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {entries.map((pl) => {
        const md = marketData[pl.id as Platform]!;
        const avg = md.avgPrice ?? md.avgSoldPrice;
        const kw = md.topKeywords ?? md.topTags ?? [];
        return (
          <div
            key={pl.id}
            style={{
              border: `1px solid ${pl.color}40`,
              borderRadius: 8,
              padding: "14px 16px",
              background: `${pl.color}08`,
            }}
          >
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: pl.color, letterSpacing: "0.1em", marginBottom: 8 }}>
              {pl.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
              {avg != null ? `$${avg.toFixed(2)}` : "—"}
            </div>
            <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
              {md.priceRange
                ? `$${md.priceRange[0]}–$${md.priceRange[1]}`
                : md.soldPriceRange
                  ? `sold $${md.soldPriceRange[0]}–$${md.soldPriceRange[1]}`
                  : "avg competitor price"}
            </div>
            {kw.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {kw.slice(0, 4).map((k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      color: "var(--sub)",
                      background: "var(--surface)",
                      border: "1px solid var(--edge)",
                      borderRadius: 3,
                      padding: "2px 6px",
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PricingResults({ pricing }: { pricing: Pricing }) {
  const entries = PLATFORMS.filter((pl) => pricing[pl.id as Platform]);
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {entries.map((pl) => {
        const p = pricing[pl.id as Platform]!;
        return (
          <div
            key={pl.id}
            style={{
              border: "1px solid var(--edge)",
              borderRadius: 8,
              padding: "16px 18px",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: pl.color }}>{pl.label}</span>
              <PosBadge pos={p.positioning} />
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>RECOMMENDED</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>${p.price.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>COMPETITOR</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--dim)" }}>${p.competitorAvg.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>MARGIN</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--signal)" }}>{p.margin}%</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.55 }}>{p.rationale}</p>
          </div>
        );
      })}
    </div>
  );
}
