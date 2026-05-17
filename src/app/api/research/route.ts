import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { AISdkClient, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import type { Platform, MarketData, MarketDataPlatform } from "@/lib/swarm/types";

export const maxDuration = 60;

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/** Stagehand extract() needs structured JSON; use OpenAI chat (not Wafer). */
function createOpenAiLlmClient(): AISdkClient {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const raw = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const modelId = raw.includes("/") ? raw.split("/").slice(1).join("/") : raw;

  const provider = createOpenAI({ apiKey });
  return new AISdkClient({ model: provider.chat(modelId) });
}

const SEARCH_URLS: Record<Platform, (q: string) => string> = {
  amazon:   (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  etsy:     (q) => `https://www.etsy.com/search?q=${encodeURIComponent(q)}`,
  ebay:     (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`,
  walmart:  (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  facebook: (q) => `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(q)}`,
};

const INSTRUCTIONS: Record<Platform, string> = {
  amazon:   "List the prices of the top products in the search results. Also list the most common keywords from their titles. Exclude sponsored listings if identifiable.",
  etsy:     "List the prices from the top listings. Also list common tags or style keywords across those listings.",
  ebay:     "List the actual sold prices from the completed/sold listings shown. These are real transaction prices.",
  walmart:  "List the shelf prices of the top products in the search results. If blocked or empty, return prices: [] and keywords: [].",
  facebook: "List the asking prices from the top marketplace listings shown.",
};

const coerceArray = <T>(inner: z.ZodType<T>) =>
  z.preprocess((val) => (val == null ? [] : val), inner);

const extractSchema = z.object({
  prices: coerceArray(z.array(z.number())).describe(
    "Numeric USD prices found on the page; use [] if none visible"
  ),
  keywords: coerceArray(z.array(z.string())).describe(
    "Common keywords from listing titles; use [] if none visible"
  ),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function safeExtract(
  stagehand: Stagehand,
  instruction: string
): Promise<{ prices: number[]; keywords: string[] }> {
  try {
    return await stagehand.extract(instruction, extractSchema);
  } catch (err) {
    console.warn("[research] extract failed, using empty result:", err);
    return { prices: [], keywords: [] };
  }
}

async function scrapePlatform(
  platform: Platform,
  query: string,
  onBrowserReady?: (urls: { debugUrl: string; sessionUrl?: string }) => void,
  onBrowserClosed?: () => void
): Promise<MarketDataPlatform> {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    verbose: 0,
    disableAPI: true,
    llmClient: createOpenAiLlmClient(),
  });

  try {
    await stagehand.init();

    const debugUrl = stagehand.browserbaseDebugURL ?? stagehand.browserbaseSessionURL;
    if (debugUrl) {
      onBrowserReady?.({
        debugUrl,
        sessionUrl: stagehand.browserbaseSessionURL,
      });
    }

    const page = stagehand.context.activePage();
    await page?.goto(SEARCH_URLS[platform](query), {
      waitUntil: "load",
      timeoutMs: 20_000,
    });
    await page?.waitForTimeout(2500);
    await page?.evaluate(() => window.scrollTo(0, Math.min(800, document.body.scrollHeight)));

    const result = await safeExtract(stagehand, INSTRUCTIONS[platform]);

    const prices = (result.prices ?? []).filter((p) => p > 0);
    const avg =
      prices.length > 0
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : undefined;
    const range: [number, number] | undefined =
      prices.length >= 2 ? [Math.min(...prices), Math.max(...prices)] : undefined;
    const keywords = (result.keywords ?? []).slice(0, 8);

    if (platform === "ebay") {
      return { soldPriceRange: range, avgSoldPrice: avg, topKeywords: keywords };
    }
    return { priceRange: range, avgPrice: avg, topKeywords: keywords, topTags: keywords };
  } finally {
    onBrowserClosed?.();
    await stagehand.close();
  }
}

async function runResearch(
  query: string,
  platforms: Platform[],
  onEvent?: (event: string, data: unknown) => void
): Promise<{ marketData: MarketData; errors: Partial<Record<Platform, string>> }> {
  const marketData: MarketData = {};
  const errors: Partial<Record<Platform, string>> = {};

  await Promise.all(
    platforms.map(async (p) => {
      try {
        const data = await scrapePlatform(
          p,
          query,
          (urls) => onEvent?.("browser", { platform: p, ...urls }),
          () => onEvent?.("browser_closed", { platform: p })
        );
        marketData[p] = data;
        onEvent?.("platform", { platform: p, data });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors[p] = msg;
        onEvent?.("platform", { platform: p, error: msg });
        console.error(`[research] ${p} scrape failed:`, err);
      }
    })
  );

  return { marketData, errors };
}

export async function POST(req: NextRequest) {
  const { query, platforms } = (await req.json()) as {
    query: string;
    platforms: Platform[];
  };

  if (!query || !Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: "query and platforms[] required" }, { status: 400 });
  }

  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    return NextResponse.json({ marketData: {}, errors: { _: "Browserbase not configured" } });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ marketData: {}, errors: { _: "OPENAI_API_KEY not configured" } });
  }

  const useStream = new URL(req.url).searchParams.get("stream") === "1";

  if (useStream) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) =>
          controller.enqueue(encoder.encode(sse(event, data)));

        try {
          const result = await runResearch(query, platforms, send);
          send("done", result);
        } catch (err) {
          send("error", { message: err instanceof Error ? err.message : String(err) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const { marketData, errors } = await runResearch(query, platforms);
  return NextResponse.json({ marketData, errors });
}
