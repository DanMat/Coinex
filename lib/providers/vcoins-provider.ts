import { CoinListing, SearchParams } from "@/lib/types";
import { SimpleCache } from "@/lib/cache/simple-cache";
import { SearchProvider } from "@/lib/providers/search-provider";
import { withRateLimit } from "@/lib/rate-limit";

const cache = new SimpleCache<CoinListing[]>(10 * 60 * 1000);

export class VCoinsProvider implements SearchProvider {
  readonly source = "vcoins" as const;

  async search(params: SearchParams): Promise<CoinListing[]> {
    const limit = Math.min(params.limit ?? 10, 25);
    const cacheKey = JSON.stringify({ ...params, limit });
    const cached = cache.get(cacheKey);
    if (cached) return filterByPrice(cached, params.minPrice, params.maxPrice).slice(0, limit);

    const url = `https://www.vcoins.com/en/Search.aspx?search=true&searchQuery=${encodeURIComponent(params.query)}`;

    const parsed = await withRateLimit("vcoins:search", 1500, async () => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "coin-search-api/1.0 (+https://vercel.com)"
          },
          next: { revalidate: 300 }
        });

        if (!response.ok) return [];
        const html = await response.text();
        return parseVcoinsSearchHtml(html);
      } catch {
        return [];
      }
    });

    const listings = parsed.length > 0 ? parsed : fallbackMockResults(params.query);
    cache.set(cacheKey, listings);
    return filterByPrice(listings, params.minPrice, params.maxPrice).slice(0, limit);
  }

  async extract(url: string): Promise<CoinListing | null> {
    if (!url.includes("vcoins.com")) return null;

    return withRateLimit("vcoins:extract", 1500, async () => {
      try {
        const response = await fetch(url, { headers: { "User-Agent": "coin-search-api/1.0" }, next: { revalidate: 300 } });
        if (!response.ok) return null;
        const html = await response.text();
        return parseVcoinsListingHtml(html, url);
      } catch {
        return null;
      }
    });
  }
}

function filterByPrice(listings: CoinListing[], minPrice?: number, maxPrice?: number): CoinListing[] {
  return listings.filter((item) => {
    if (typeof item.price !== "number") return true;
    if (typeof minPrice === "number" && item.price < minPrice) return false;
    if (typeof maxPrice === "number" && item.price > maxPrice) return false;
    return true;
  });
}

function parseVcoinsSearchHtml(html: string): CoinListing[] {
  const matches = [...html.matchAll(/href="(https:\/\/www\.vcoins\.com\/en\/stores\/[^"]+)"/g)].slice(0, 20);
  const uniqueUrls = Array.from(new Set(matches.map((m) => m[1])));

  return uniqueUrls.map((url, idx) => ({
    id: `vcoins-${idx}-${Buffer.from(url).toString("base64").slice(0, 8)}`,
    source: "vcoins",
    title: `VCoins listing ${idx + 1}`,
    url,
    imageUrls: [],
    raw: { parsedFrom: "search-html" }
  }));
}

function parseVcoinsListingHtml(html: string, url: string): CoinListing {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const imgMatches = [...html.matchAll(/<meta property="og:image" content="([^"]+)"/gi)].map((m) => m[1]);
  return {
    id: `vcoins-${Buffer.from(url).toString("base64").slice(0, 12)}`,
    source: "vcoins",
    title: titleMatch?.[1]?.replace(/\s+\|\s+VCoins.*/i, "").trim() ?? "VCoins listing",
    url,
    imageUrls: imgMatches.slice(0, 4),
    raw: { parsedFrom: "listing-html" }
  };
}

function fallbackMockResults(query: string): CoinListing[] {
  return [
    {
      id: "vcoins-mock-1",
      source: "vcoins",
      title: `Mock VCoins result for ${query}`,
      description: "TODO: Improve VCoins parser robustness against markup changes.",
      price: 95,
      currency: "USD",
      dealer: "Sample Ancient Coins",
      url: "https://www.vcoins.com/en/stores/example/mock_listing.html",
      imageUrls: []
    }
  ];
}
