"use client";

import type { Platform } from "@/lib/swarm";
import type { LiveBrowserSession, PausedStage } from "./stage-panels";

export type OrchestratorAgent = {
  id: string;
  name: string;
  phase: 1 | 2 | 3 | 4;
  type: "BROWSERBASE" | "CLAUDE";
  activeLabel: string;
  result: string;
  status: "queued" | "active" | "complete";
  elapsed?: number;
};

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "amazon", label: "Amazon", color: "#FF9900" },
  { id: "etsy", label: "Etsy", color: "#F1641E" },
  { id: "ebay", label: "eBay", color: "#E53238" },
  { id: "walmart", label: "Walmart", color: "#0071CE" },
];

const NODE_SLOTS: Record<string, { angle: number; radius: number; ring: string }> = {
  "bb-amazon": { angle: -90, radius: 34, ring: "SCOUT" },
  "bb-etsy": { angle: 0, radius: 34, ring: "SCOUT" },
  "bb-ebay": { angle: 90, radius: 34, ring: "SCOUT" },
  "bb-walmart": { angle: 180, radius: 34, ring: "SCOUT" },
  pricing: { angle: -135, radius: 48, ring: "PRICE" },
  "lst-amazon": { angle: -45, radius: 48, ring: "WRITE" },
  "lst-etsy": { angle: 45, radius: 48, ring: "WRITE" },
  "lst-ebay": { angle: 135, radius: 48, ring: "WRITE" },
  "lst-walmart": { angle: -170, radius: 48, ring: "WRITE" },
  "meta-ads": { angle: -110, radius: 62, ring: "GROW" },
  tiktok: { angle: -70, radius: 62, ring: "GROW" },
  email: { angle: 110, radius: 62, ring: "GROW" },
  social: { angle: 70, radius: 62, ring: "GROW" },
};

function polarToXY(angleDeg: number, radiusPct: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + (radiusPct / 100) * cx * Math.cos(rad),
    y: cy + (radiusPct / 100) * cy * Math.sin(rad),
  };
}

function shortName(name: string) {
  if (name.includes("Research")) return name.replace(" Research", "");
  if (name.includes("Listing")) return name.replace(" Listing", "");
  if (name.includes("Agent")) return name.replace(" Agent", "");
  return name.split(" ")[0];
}

function platformFromAgentId(agentId: string): Platform | undefined {
  return PLATFORMS.find((p) => agentId.includes(p.id))?.id;
}

function floatDelay(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 100;
  return `${(h / 100) * 4}s`;
}

function hubStatus(
  agents: OrchestratorAgent[],
  pausedAt: PausedStage | null,
  allComplete: boolean
) {
  if (allComplete) return { label: "KIT READY" };
  if (pausedAt) return { label: "REVIEW" };
  if (agents.some((a) => a.status === "active")) return { label: "RUNNING" };
  return { label: "STANDBY" };
}

function hubAgentStatus(
  agents: OrchestratorAgent[],
  pausedAt: PausedStage | null,
  allComplete: boolean
): OrchestratorAgent["status"] {
  if (allComplete) return "complete";
  if (pausedAt || agents.some((a) => a.status === "active")) return "active";
  return "queued";
}

function AgentNode({
  agent,
  left,
  top,
  accent,
  hub,
  typeLabel,
  tooltip,
  browserSession,
  platformLabel,
}: {
  agent: OrchestratorAgent;
  left: number;
  top: number;
  accent?: string;
  hub?: boolean;
  typeLabel?: string;
  tooltip?: string;
  browserSession?: LiveBrowserSession;
  platformLabel?: string;
}) {
  const active = agent.status === "active";
  const done = agent.status === "complete";
  const queued = agent.status === "queued";
  const hasBrowser = Boolean(browserSession);
  const isLive = browserSession?.status === "live";

  const border = active
    ? "rgba(240,160,40,0.55)"
    : done
      ? "rgba(0,232,122,0.4)"
      : hub
        ? "rgba(240,160,40,0.35)"
        : hasBrowser && isLive
          ? `${accent ?? "var(--amber)"}88`
          : "var(--edge)";
  const glow = accent && (active || done || (hasBrowser && isLive)) ? `${accent}28` : undefined;

  return (
    <div
      className={`orchestrator-node${hub ? " orchestrator-node--hub" : ""}${hasBrowser ? " orchestrator-node--browser" : ""}${active ? " orchestrator-node--active" : ""}${done ? " orchestrator-node--done" : ""}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        borderColor: border,
        boxShadow: glow ? `0 0 22px ${glow}` : undefined,
        opacity: queued && !hub && !hasBrowser ? 0.55 : 1,
        ["--float-delay" as string]: floatDelay(agent.id),
      }}
      title={tooltip ?? agent.name}
    >
      <div className="orchestrator-node__inner">
        {hasBrowser ? (
          <>
            <div className="orchestrator-node__browser-head">
              <span className="orchestrator-node__label" style={{ color: accent }}>
                {platformLabel ?? shortName(agent.name)}
              </span>
              <span
                className="orchestrator-node__live"
                style={{
                  color: isLive ? "var(--amber)" : "var(--signal)",
                  animation: isLive ? "pulseLive 1s ease infinite" : undefined,
                }}
              >
                {isLive ? "● LIVE" : "✓ DONE"}
              </span>
            </div>
            {isLive ? (
              <iframe
                className="orchestrator-node__frame"
                src={browserSession!.debugUrl}
                title={`${platformLabel ?? agent.name} live session`}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="orchestrator-node__frame orchestrator-node__frame--done">
                <span>Session complete</span>
              </div>
            )}
            {isLive && (
              <a
                className="orchestrator-node__link"
                href={browserSession!.debugUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Open debugger ↗
              </a>
            )}
          </>
        ) : (
          <>
            <span
              className="orchestrator-node__dot"
              style={{
                background: active ? "var(--amber)" : done ? "var(--signal)" : "var(--dim)",
              }}
            />
            <span className="orchestrator-node__label">{shortName(agent.name)}</span>
            <span className="orchestrator-node__type">
              {typeLabel ?? (agent.type === "BROWSERBASE" ? "BB" : "AI")}
            </span>
          </>
        )}
        {active && !hasBrowser && <span className="orchestrator-node__pulse" />}
      </div>
    </div>
  );
}

export function OrchestratorHub({
  agents,
  productName,
  pausedAt,
  allComplete,
  totalTime,
  liveBrowsers = {},
}: {
  agents: OrchestratorAgent[];
  productName: string;
  pausedAt: PausedStage | null;
  allComplete: boolean;
  totalTime: number;
  liveBrowsers?: Partial<Record<Platform, LiveBrowserSession>>;
}) {
  const cx = 50;
  const cy = 50;
  const status = hubStatus(agents, pausedAt, allComplete);
  const completeCount = agents.filter((a) => a.status === "complete").length;
  const total = agents.length;

  const nodes = agents
    .filter((a) => NODE_SLOTS[a.id])
    .map((a) => {
      const slot = NODE_SLOTS[a.id];
      const pos = polarToXY(slot.angle, slot.radius, cx, cy);
      const platform = PLATFORMS.find((p) => a.id.includes(p.id));
      const platformId = platformFromAgentId(a.id);
      const browserSession =
        a.type === "BROWSERBASE" && platformId ? liveBrowsers[platformId] : undefined;
      return { agent: a, slot, pos, platform, browserSession };
    });

  return (
    <div className="orchestrator-wrap">
      <div className="orchestrator-canvas">
        <svg className="orchestrator-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(240,160,40,0.22)" />
              <stop offset="100%" stopColor="rgba(240,160,40,0)" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r="28" fill="url(#hubGlow)" className="orchestrator-glow" />
          {[34, 48, 62].map((r) => (
            <circle
              key={r}
              cx={cx}
              cy={cy}
              r={(r / 100) * cx}
              fill="none"
              stroke="var(--edge)"
              strokeWidth="0.15"
              strokeDasharray="0.6 0.8"
              className="orchestrator-ring"
              style={{ animationDelay: `${r * 0.05}s` }}
            />
          ))}
          {nodes.map(({ agent, pos, browserSession }) => {
            const active = agent.status === "active";
            const done = agent.status === "complete";
            const sessionLive = browserSession?.status === "live";
            return (
              <line
                key={`line-${agent.id}`}
                x1={cx}
                y1={cy}
                x2={pos.x}
                y2={pos.y}
                stroke={
                  sessionLive || active
                    ? "rgba(240,160,40,0.55)"
                    : done
                      ? "rgba(0,232,122,0.35)"
                      : "rgba(39,39,51,0.9)"
                }
                strokeWidth={sessionLive || active ? 0.35 : 0.2}
                className={`orchestrator-line${sessionLive || active ? " orchestrator-pulse-line" : ""}`}
              />
            );
          })}
        </svg>

        <AgentNode
          hub
          agent={{
            id: "orchestrator",
            name: "Orchestrator",
            phase: 1,
            type: "CLAUDE",
            activeLabel: "",
            result: "",
            status: hubAgentStatus(agents, pausedAt, allComplete),
          }}
          left={50}
          top={50}
          accent="var(--amber)"
          typeLabel={`${status.label} · ${completeCount}/${total}${totalTime > 0 ? ` · ${totalTime}s` : ""}`}
          tooltip={productName}
        />

        {nodes.map(({ agent, pos, platform, browserSession }) => (
          <AgentNode
            key={agent.id}
            agent={agent}
            left={pos.x}
            top={pos.y}
            accent={platform?.color}
            browserSession={browserSession}
            platformLabel={platform?.label}
          />
        ))}

        <div className="orchestrator-legend">
          {["SCOUT", "PRICE", "WRITE", "GROW"].map((ring) => (
            <span key={ring} className="orchestrator-legend__item">
              {ring}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
