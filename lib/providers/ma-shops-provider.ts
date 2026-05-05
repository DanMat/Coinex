import { CoinListing, SearchParams } from "@/lib/types";
import { SearchProvider } from "@/lib/providers/search-provider";

export class MaShopsProvider implements SearchProvider {
  readonly source = "ma-shops" as const;

  async search(_: SearchParams): Promise<CoinListing[]> {
    // TODO: Implement MA-Shops integration against allowed public endpoints/pages only.
    // This placeholder intentionally returns no results until compliant integration is verified.
    return [];
  }

  async extract(_: string): Promise<CoinListing | null> {
    // TODO: Implement listing extraction when robust selectors and robots policy are validated.
    return null;
  }
}
