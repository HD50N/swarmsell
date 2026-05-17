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
  signal?: AbortSignal;
};

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

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

function dispatchSseEvent(
  event: string,
  data: string,
  handlers: SseHandlers | undefined,
  accum: { marketData: MarketData; errors: Partial<Record<Platform, string>> }
) {
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
      accum.errors = { ...accum.errors, [platform]: String(parsed.error) };
    } else if (parsed.data) {
      accum.marketData = { ...accum.marketData, [platform]: parsed.data as MarketData[Platform] };
    }
  } else if (event === "done") {
    accum.marketData = (parsed.marketData as MarketData) ?? accum.marketData;
    accum.errors = (parsed.errors as Partial<Record<Platform, string>>) ?? accum.errors;
  }
}

async function runMarketResearchStream(
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
    signal: handlers?.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err === "object" && err && "error" in err
        ? String((err as { error: string }).error)
        : `Research failed (${res.status})`
    );
  }

  if (!res.body) {
    throw new Error("Research stream has no body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const accum: ResearchResult = { marketData: {}, errors: {} };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const { events, rest } = parseSseBuffer(buffer);
    buffer = rest;

    for (const { event, data } of events) {
      try {
        dispatchSseEvent(event, data, handlers, accum);
      } catch (e) {
        console.warn("[browserbaseResearch] SSE parse error:", e);
      }
    }
  }

  return accum;
}

async function runMarketResearchJson(
  productName: string,
  platforms: Platform[],
  signal?: AbortSignal
): Promise<ResearchResult> {
  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: productName, platforms }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[browserbaseResearch] /api/research failed:", err);
    return { marketData: {}, errors: {} };
  }

  return res.json() as Promise<ResearchResult>;
}

/**
 * Browserbase market research. Prefers SSE for live browser URLs; falls back to JSON.
 */
export async function runMarketResearch(
  productName: string,
  platforms: Platform[],
  handlers?: SseHandlers
): Promise<ResearchResult> {
  try {
    return await runMarketResearchStream(productName, platforms, handlers);
  } catch (err) {
    if (isAbortError(err)) throw err;
    console.warn("[browserbaseResearch] SSE failed, falling back to JSON:", err);
    return runMarketResearchJson(productName, platforms, handlers?.signal);
  }
}
