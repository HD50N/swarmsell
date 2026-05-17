import type { MarketData, Platform } from "./types";

export type ResearchResult = {
  marketData: MarketData;
  errors: Partial<Record<Platform, string>>;
};

export type BrowserSessionEvent = {
  platform: Platform;
  debugUrl: string;
  sessionUrl?: string;
};

type SseHandlers = {
  onBrowserSession?: (event: BrowserSessionEvent) => void;
  onBrowserClosed?: (platform: Platform) => void;
};

function parseSseBuffer(buffer: string): {
  events: Array<{ event: string; data: string }>;
  rest: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) data += line.slice(6);
    }
    if (data) events.push({ event, data });
  }

  return { events, rest };
}

/**
 * Browserbase market research with live session URLs streamed as each browser starts.
 */
export async function runMarketResearch(
  productName: string,
  platforms: Platform[],
  handlers?: SseHandlers
): Promise<ResearchResult> {
  const res = await fetch("/api/research?stream=1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ query: productName, platforms }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[browserbaseResearch] /api/research failed:", err);
    return { marketData: {}, errors: {} };
  }

  if (!res.body) {
    return { marketData: {}, errors: {} };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let marketData: MarketData = {};
  let errors: Partial<Record<Platform, string>> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const { events, rest } = parseSseBuffer(buffer);
    buffer = rest;

    for (const { event, data } of events) {
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "browser") {
          handlers?.onBrowserSession?.({
            platform: parsed.platform as Platform,
            debugUrl: parsed.debugUrl as string,
            sessionUrl: parsed.sessionUrl as string | undefined,
          });
        } else if (event === "browser_closed") {
          handlers?.onBrowserClosed?.(parsed.platform as Platform);
        } else if (event === "platform") {
          const platform = parsed.platform as Platform;
          if (parsed.error) {
            errors = { ...errors, [platform]: String(parsed.error) };
          } else if (parsed.data) {
            marketData = { ...marketData, [platform]: parsed.data as MarketData[Platform] };
          }
        } else if (event === "done") {
          marketData = (parsed.marketData as MarketData) ?? marketData;
          errors = (parsed.errors as Partial<Record<Platform, string>>) ?? errors;
        }
      } catch (e) {
        console.warn("[browserbaseResearch] SSE parse error:", e);
      }
    }
  }

  return { marketData, errors };
}
