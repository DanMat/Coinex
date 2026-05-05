import { CoinListing, SearchParams } from "@/lib/types";

export interface SearchProvider {
  readonly source: "vcoins" | "ma-shops";
  search(params: SearchParams): Promise<CoinListing[]>;
  extract(url: string): Promise<CoinListing | null>;
}
