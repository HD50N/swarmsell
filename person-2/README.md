# Person 2 — Marketing Agents

Person 2 owns the four marketing agents (Meta / TikTok / Email / Social) and
the launch-kit exporter. Person 1 owns the input UI, dashboard, Browserbase
research, pricing, listing agents, and the `/api/generate` route that proxies
to Wafer Pass.

```
person-2/
├── README.md                      ← this file
├── types.ts                       ← integration contract with Person 1
├── exportKit.ts                   ← markdown serializer + download trigger
└── agents/
    ├── metaAdAgent.ts             ← 3 Meta ad variants
    ├── tiktokAgent.ts             ← 3 TikTok video concepts
    ├── emailAgent.ts              ← 3-email launch sequence
    ├── socialAgent.ts             ← 7-day caption bank
    └── runMarketingAgents.ts      ← Promise.allSettled wrapper
```

## How it talks to the LLM

All four agents call `callWafer` from `src/lib/callWafer.ts`, which POSTs to
`/api/generate`. That route (Person 1's) proxies to Wafer Pass's
OpenAI-compatible Chat Completions endpoint with the configured model
(default `Qwen3.5-397B-A17B`, vision-capable).

Run the agents from a Client Component context (e.g. inside the dashboard's
`useEffect` after mount), because `callWafer` uses a relative-URL fetch.

## Output shapes (consumed by the dashboard)

```ts
type MarketingOutputs = {
  meta?:   { variants: { type, headline, primaryText, cta }[] };          // 3
  tiktok?: { scripts:  { hook, body, caption, hashtags }[] };             // 3
  email?:  { emails:   { stage, subject, preheader, body }[] };           // 3
  social?: { days:     { day, posts: { channel, caption, hashtags }[] }[] }; // 7×3
};
```

These are **richer** than the current hardcoded mocks in
`src/app/dashboard/page.tsx`. The dashboard's render code needs small field
remaps when wiring real data in (e.g. Meta's `primaryText` vs the mock's
`text`, TikTok's added `body`, social's per-day×channel structure vs the
mock's flat day list). See [Wiring into the dashboard](#wiring-into-the-dashboard).

## Running the swarm

```ts
import { runMarketingAgents } from "../../person-2/agents/runMarketingAgents";
import type { LaunchKit } from "../../person-2/types";

const { outputs, errors } = await runMarketingAgents(kit);
// outputs: MarketingOutputs   (a key is missing iff that agent failed)
// errors:  per-channel error strings for whichever ones failed
```

`Promise.allSettled` semantics: one failing agent does NOT kill the others.

⚠️ **Wafer Pass caps personal use at 3 concurrent requests.** This runner
fires 4 at once. If you hit the cap, either serialize one of the calls or
chunk it as `Promise.all([Promise.all([meta, tiktok, email]), social])`.

## Wiring into the dashboard

`src/app/dashboard/page.tsx` currently hardcodes the marketing output as the
`MARKETING` constant. To wire real data:

1. Replace the `MARKETING` constant with a `useState<MarketingOutputs>(...)`.
2. In a `useEffect` (after the existing simulated agent timeline), call
   `runMarketingAgents(kit)` with the `LaunchKit` assembled from
   `localStorage["swarmsell-product"]` + Person 1's pricing/listings results.
3. Add small adapters where the field names differ:
   - Meta: `text` → `primaryText`
   - TikTok: add `body` rendering
   - Email: `preview` → `preheader`; render `body`
   - Social: flatten `days[d].posts[i]` to whatever calendar shape the
     dashboard renders
4. Mark each `meta-ads` / `tiktok` / `email` / `social` agent in
   `INITIAL_AGENTS` as `complete` as its promise settles.

## Export

`exportKit.ts` exposes `downloadKitMarkdown(kit, marketing)` — fires a
client-side blob download of the full launch kit as a single `.md` file.
The dashboard could add a "Download kit" button that calls this.

## Environment

Only one env var is needed at this point:

```bash
WAFER_API_KEY=wafer_pk_...   # read by src/app/api/generate/route.ts
```

The legacy `ANTHROPIC_API_KEY` from the original plan is no longer used —
the project pivoted to Wafer-only in commit `cb46bfd`.

## Known limitations

- `src/app/api/generate/route.ts` hardcodes `max_tokens: 2000`. That's tight
  for `socialAgent` (7 days × 3 captions) and `emailAgent` (3 full emails).
  If outputs come back truncated, ask Person 1 to either raise the default
  or accept a `max_tokens` field on the request body.
- `callWafer` uses a relative URL, so agents can only run from the browser.
- Wafer's 3-concurrent personal-use cap may bite when all 4 marketing agents
  fire in parallel; serialize if it does.
