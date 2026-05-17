import { runMarketResearch, type BrowserSessionEvent } from "./browserbaseResearch";
import { pricingAgent } from "./pricingAgent";
import { runListingAgents } from "./listingAgents";
import type { ProductInput, LaunchKit, Platform } from "./types";

export type SwarmPhase = "research" | "pricing" | "listings" | "complete";

export type SwarmProgressEvent = {
  phase: SwarmPhase;
  done?: boolean;
  /** Partial kit snapshot when a phase finishes (before the next phase starts). */
  snapshot?: LaunchKit;
  /** Browserbase live debugger URL as each platform session starts. */
  browserSession?: BrowserSessionEvent;
  /** Browser session ended (debugger WebSocket will disconnect). */
  browserClosed?: Platform;
};

/**
 * Sell-side pipeline: Browserbase research → pricing → listing agents (parallel).
 */
export type RunSwarmOptions = {
  signal?: AbortSignal;
};

export async function runSwarm(
  product: ProductInput,
  platforms: Platform[],
  onProgress?: (event: SwarmProgressEvent) => void | Promise<void>,
  options?: RunSwarmOptions
): Promise<LaunchKit> {
  await onProgress?.({ phase: "research" });
  const { marketData } = await runMarketResearch(product.name, platforms, {
    onBrowserSession: (browserSession) => onProgress?.({ phase: "research", browserSession }),
    onBrowserClosed: (platform) => onProgress?.({ phase: "research", browserClosed: platform }),
    signal: options?.signal,
  });

  await onProgress?.({
    phase: "pricing",
    snapshot: { product, marketData, pricing: {}, listings: {} },
  });
  const pricing = await pricingAgent(product, marketData, platforms);

  await onProgress?.({
    phase: "listings",
    snapshot: { product, marketData, pricing, listings: {} },
  });
  const listings = await runListingAgents(product, pricing, marketData, platforms);

  const kit = { product, marketData, pricing, listings };
  await onProgress?.({ phase: "complete", done: true, snapshot: kit });

  return kit;
}
