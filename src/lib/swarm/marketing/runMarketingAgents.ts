import type { LaunchKit, MarketingOutputs } from "../types";
import { emailAgent } from "./emailAgent";
import { metaAdAgent } from "./metaAdAgent";
import { socialAgent } from "./socialAgent";
import { tiktokAgent } from "./tiktokAgent";

export type MarketingRunResult = {
  outputs: MarketingOutputs;
  errors: Partial<Record<keyof MarketingOutputs, string>>;
};

export async function runMarketingAgents(kit: LaunchKit): Promise<MarketingRunResult> {
  const [meta, tiktok, email, social] = await Promise.allSettled([
    metaAdAgent(kit),
    tiktokAgent(kit),
    emailAgent(kit),
    socialAgent(kit),
  ]);

  const outputs: MarketingOutputs = {};
  const errors: Partial<Record<keyof MarketingOutputs, string>> = {};

  if (meta.status === "fulfilled") outputs.meta = meta.value;
  else errors.meta = String(meta.reason);

  if (tiktok.status === "fulfilled") outputs.tiktok = tiktok.value;
  else errors.tiktok = String(tiktok.reason);

  if (email.status === "fulfilled") outputs.email = email.value;
  else errors.email = String(email.reason);

  if (social.status === "fulfilled") outputs.social = social.value;
  else errors.social = String(social.reason);

  return { outputs, errors };
}
