export type CoinSource = "vcoins" | "ma-shops" | "manual";

export type CoinListing = {
  id: string;
  source: CoinSource;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  dealer?: string;
  url: string;
  imageUrls: string[];
  listedAt?: string;
  raw?: unknown;
};

export type CoinEvaluation = {
  visualScore: number;
  storyFitScore?: number;
  priceConfidenceScore: number;
  riskScore: number;
  overallRecommendation: "BUY" | "MAYBE" | "SKIP";
  summary: string;
  strengths: string[];
  concerns: string[];
  collectionFit?: string;
  priceNotes: string;
  imageAssessmentLimitations: string;
};

export type CollectionProfile = {
  id: string;
  name: string;
  description: string;
  priorities: string[];
  ownedCoins: string[];
};

export type SearchParams = {
  query: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
};

export type SearchSource = "vcoins" | "ma-shops";
