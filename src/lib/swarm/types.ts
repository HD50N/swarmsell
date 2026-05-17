// Shared types for the swarm pipeline: research → pricing → listings → marketing.

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
  day: number;
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
