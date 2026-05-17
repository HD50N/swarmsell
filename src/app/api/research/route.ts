import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { AISdkClient, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { ALL_PLATFORMS, type Platform, type MarketData, type MarketDataPlatform } from "@/lib/swarm/types";

export const maxDuration = 300;

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

/** Public Etsy market pages avoid the sign-in wall on /search. */
function etsyMarketSlug(query: string): string {
  const slug = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return slug || "handmade";
}

const SEARCH_URLS: Record<Platform, (q: string) => string> = {
  amazon: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  // Market browse pages are guest-accessible (search often redirects to sign-in).
  etsy: (q) => `https://www.etsy.com/market/${etsyMarketSlug(q)}`,
  // Active Buy It Now listings — sold/completed filters often require sign-in.
  ebay: (q) =>
    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_BIN=1&_sop=15&rt=nc&_ipg=60`,
  walmart: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
};

const INSTRUCTIONS: Record<Platform, string> = {
  amazon:
    "List the prices of the top products in the search results. Also list the most common keywords from their titles. Exclude sponsored listings if identifiable.",
  etsy:
    "On this Etsy market page, list USD prices from visible product listings. Also list common tags or style keywords from titles. If you see a sign-in page instead of listings, return prices: [] and keywords: [].",
  ebay:
    "List the Buy It Now prices from the search results (ignore auction-only listings). Also list common keywords from titles. If blocked or empty, return prices: [] and keywords: [].",
  walmart:
    "List shelf prices from product search results. If you see a robot check, captcha, or block page, return prices: [] and keywords: [].",
};

const PAGE_WAIT_MS: Record<Platform, number> = {
  amazon: 2500,
  etsy: 3500,
  ebay: 3000,
  walmart: 4500,
};

async function dismissCommonOverlays(
  page: { evaluate: (fn: () => void) => Promise<unknown> } | null | undefined
) {
  if (!page) return;
  try {
    await page.evaluate(() => {
      const labels = ["accept all", "accept", "agree", "i agree", "got it", "allow all", "continue"];
      const nodes = Array.from(document.querySelectorAll("button, a, [role='button']"));
      for (const label of labels) {
        const hit = nodes.find((el) =>
          el.textContent?.trim().toLowerCase().includes(label)
        );
        if (hit instanceof HTMLElement) {
          hit.click();
          break;
        }
      }
    });
  } catch {
    /* optional */
  }
}

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
    // Default Browserbase session — advancedStealth requires Enterprise (403 otherwise).
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
      waitUntil: "domcontentloaded",
      timeoutMs: 25_000,
    });
    await page?.waitForTimeout(PAGE_WAIT_MS[platform]);
    await dismissCommonOverlays(page);
    await page?.waitForTimeout(800);
    await page?.evaluate(() => window.scrollTo(0, Math.min(900, document.body.scrollHeight)));

    const result = await safeExtract(stagehand, INSTRUCTIONS[platform]);

    const prices = (result.prices ?? []).filter((p) => p > 0);
    const avg =
      prices.length > 0
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : undefined;
    const range: [number, number] | undefined =
      prices.length >= 2 ? [Math.min(...prices), Math.max(...prices)] : undefined;
    const keywords = (result.keywords ?? []).slice(0, 8);

    return {
      priceRange: range,
      avgPrice: avg,
      topKeywords: keywords,
      topTags: keywords,
    };
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

  const activePlatforms = platforms.filter((p): p is Platform =>
    (ALL_PLATFORMS as readonly string[]).includes(p)
  );
  if (activePlatforms.length === 0) {
    return NextResponse.json({ error: "No supported platforms" }, { status: 400 });
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

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            /* stream closed */
          }
        }, 10_000);

        try {
          const result = await runResearch(query, activePlatforms, send);
          send("done", result);
        } catch (err) {
          send("error", { message: err instanceof Error ? err.message : String(err) });
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const { marketData, errors } = await runResearch(query, activePlatforms);
  return NextResponse.json({ marketData, errors });
}
