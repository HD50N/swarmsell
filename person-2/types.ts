// Integration contract between Person 1 (input/research/pricing/listings) and
// Person 2 (marketing/dashboard/export). Person 1's pipeline must produce a
// LaunchKit; Person 2's marketing agents and Dashboard consume it.
//
// If Person 1 changes the schema, update this file and we'll catch mismatches
// at compile time.

export type Platform = "amazon" | "etsy" | "ebay" | "walmart" | "facebook";

export const ALL_PLATFORMS: readonly Platform[] = [
  "amazon",
  "etsy",
  "ebay",
  "walmart",
  "facebook",
] as const;

export type ProductInput = {
  name: string;
  category: string;
  description?: string;
  cost?: number;
  targetMargin?: number;
  // base64-encoded JPEGs; passed to Claude as image content blocks.
  images: string[];
};

export type MarketDataPlatform = {
  priceRange?: [number, number];
  avgPrice?: number;
  soldPriceRange?: [number, number];
  avgSoldPrice?: number;
  topKeywords?: string[];
  topTags?: string[];
};

export type MarketData = Partial<Record<Platform, MarketDataPlatform>>;

export type Positioning = "undercut" | "match" | "premium";

export type PricingEntry = {
  price: number;
  margin: number;
  competitorAvg: number;
  positioning: Positioning;
  rationale: string;
};

export type Pricing = Partial<Record<Platform, PricingEntry>>;

export type AmazonListing = {
  title: string;
  bullets: string[];
  keywords: string[];
};
export type EtsyListing = {
  title: string;
  tags: string[];
  description: string;
};
export type EbayListing = {
  title: string;
  condition: string;
  specs: Record<string, string>;
  format?: "auction" | "buy-now";
  rationale?: string;
};
export type WalmartListing = {
  title: string;
  description: string;
  specs?: Record<string, string>;
};
export type FacebookListing = {
  title: string;
  description: string;
};

export type Listings = {
  amazon?: AmazonListing;
  etsy?: EtsyListing;
  ebay?: EbayListing;
  walmart?: WalmartListing;
  facebook?: FacebookListing;
};

export type LaunchKit = {
  product: ProductInput;
  marketData: MarketData;
  pricing: Pricing;
  listings: Listings;
};

// ─── Person 2 marketing-agent output shapes ──────────────────────────────────

export type MetaAdVariantType = "awareness" | "consideration" | "conversion";

export type MetaAdVariant = {
  type: MetaAdVariantType;
  headline: string;
  primaryText: string;
  cta: string;
};

export type MetaAdsOutput = {
  variants: MetaAdVariant[];
};

export type TikTokScript = {
  hook: string;
  body: string;
  caption: string;
  hashtags: string[];
};

export type TikTokOutput = {
  scripts: TikTokScript[];
};

export type EmailStage = "welcome" | "benefits" | "promo";

export type EmailDraft = {
  stage: EmailStage;
  subject: string;
  preheader: string;
  body: string;
};

export type EmailSequenceOutput = {
  emails: EmailDraft[];
};

export type SocialChannel = "instagram" | "facebook" | "pinterest";

export type SocialPost = {
  channel: SocialChannel;
  caption: string;
  hashtags: string[];
};

export type SocialDay = {
  day: number; // 1-7
  posts: SocialPost[];
};

export type SocialOutput = {
  days: SocialDay[];
};

export type MarketingOutputs = {
  meta?: MetaAdsOutput;
  tiktok?: TikTokOutput;
  email?: EmailSequenceOutput;
  social?: SocialOutput;
};
