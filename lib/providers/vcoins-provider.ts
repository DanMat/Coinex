import { CoinListing, SearchParams } from "@/lib/types";
import { SimpleCache } from "@/lib/cache/simple-cache";
import { SearchProvider } from "@/lib/providers/search-provider";
import { withRateLimit } from "@/lib/rate-limit";

const cache = new SimpleCache<CoinListing[]>(10 * 60 * 1000);

export class VCoinsProvider implements SearchProvider {
  readonly source = "vcoins" as const;

  async search(params: SearchParams): Promise<CoinListing[]> {
    const limit = Math.min(params.limit ?? 10, 100);
    const cacheKey = JSON.stringify({ ...params, limit });
    const cached = cache.get(cacheKey);
    if (cached) return cached.slice(0, limit);

    const searchUrl = buildVcoinsSearchUrl(params.query, limit, params.minPrice, params.maxPrice);
    console.log(`[vcoins] generated search URL: ${searchUrl}`);

    const parsed = await withRateLimit("vcoins:search", 1500, async () => {
      try {
        const response = await fetch(searchUrl, {
          headers: {
            "User-Agent": "coin-search-api/1.0 (+https://vercel.com)"
          },
          next: { revalidate: 300 }
        });

        console.log(`[vcoins] HTTP status: ${response.status}`);

        if (!response.ok) {
          console.log(`[vcoins] fallback reason: non-OK HTTP response`);
          return [];
        }

        const html = await response.text();
        const parsedListings = parseVcoinsSearchHtml(html, limit);
        console.log(`[vcoins] number of parsed listings: ${parsedListings.length}`);

        if (parsedListings.length === 0) {
          console.log(`[vcoins] fallback reason: parser returned 0 listings`);
        }

        return parsedListings;
      } catch (error) {
        console.log(`[vcoins] fallback reason: fetch/parse error`, error);
        return [];
      }
    });

    const listings = parsed.length > 0 ? parsed : fallbackMockResults(params.query);
    cache.set(cacheKey, listings);
    return listings.slice(0, limit);
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

function buildVcoinsSearchUrl(query: string, limit: number, minPrice?: number, maxPrice?: number): string {
  const maxRecords = Math.min(Math.max(limit, 1), 100);
  const searchBetween = typeof minPrice === "number" ? Math.max(minPrice, 0) : 0;
  const searchBetweenAnd = typeof maxPrice === "number" ? Math.max(maxPrice, 0) : 0;

  const params = new URLSearchParams({
    search: "true",
    searchQuery: query,
    searchQueryExclude: "",
    searchCategory: "0",
    searchCategoryLevel: "2",
    searchCategoryAncient: "True",
    searchCategoryUs: "True",
    searchCategoryWorld: "True",
    searchCategoryMints: "True",
    searchBetween: String(searchBetween),
    searchBetweenAnd: String(searchBetweenAnd),
    searchDate: "",
    searchUseThesaurus: "True",
    searchDisplayCurrency: "",
    searchDisplay: "1",
    searchIdStore: "0",
    searchQueryAnyWords: "",
    searchExactPhrase: "",
    searchTitleAndDescription: "True",
    searchDateType: "0",
    searchMaxRecords: String(maxRecords),
    SearchOnSale: "False",
    Unassigned: "False"
  });

  return `https://www.vcoins.com/en/Search.aspx?${params.toString()}`;
}

function parseVcoinsSearchHtml(html: string, limit: number): CoinListing[] {
  const cardChunks = html.split(/<div[^>]+class="[^"]*(?:product|item|searchresult)[^"]*"[^>]*>/i);
  const items: CoinListing[] = [];

  for (const chunk of cardChunks) {
    const listing = parseCardChunk(chunk);
    if (listing) items.push(listing);
    if (items.length >= limit) break;
  }

  if (items.length > 0) return dedupeByUrl(items);

  const fallbackLinks = [...html.matchAll(/href="(https:\/\/www\.vcoins\.com\/en\/stores\/[^"]+)"/gi)].map((m) => m[1]);
  const uniqueLinks = Array.from(new Set(fallbackLinks)).slice(0, limit);
  return uniqueLinks.map((url, index) => ({
    id: `vcoins-${index}-${Buffer.from(url).toString("base64").slice(0, 8)}`,
    source: "vcoins",
    title: `VCoins listing ${index + 1}`,
    url,
    imageUrls: [],
    raw: { parsedFrom: "search-link-fallback" }
  }));
}

function parseCardChunk(chunk: string): CoinListing | null {
  const urlMatch = chunk.match(/href="(https:\/\/www\.vcoins\.com\/en\/stores\/[^"]+)"/i);
  if (!urlMatch) return null;

  const titleMatch = chunk.match(/title="([^"]+)"/i) ?? chunk.match(/>([^<]{12,220})<\/a>/i);
  const priceMatch = chunk.match(/(?:US\$|\$|EUR|GBP|CAD|AUD|CHF|JPY)\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i);
  const currencyMatch = chunk.match(/(US\$|\$|EUR|GBP|CAD|AUD|CHF|JPY)/i);
  const dealerMatch = chunk.match(/(?:Dealer|Store|Sold by)[:\s]*<[^>]*>([^<]+)</i) ?? chunk.match(/class="[^"]*dealer[^"]*"[^>]*>([^<]+)</i);
  const imgMatches = [...chunk.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => absolutizeUrl(m[1]));
  const descriptionMatch = chunk.match(/<p[^>]*>(.*?)<\/p>/i);

  const cleanTitle = cleanupText(titleMatch?.[1] ?? "");
  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
  const currency = normalizeCurrency(currencyMatch?.[1]);
  const description = cleanupText(descriptionMatch?.[1] ?? "");

  return {
    id: `vcoins-${Buffer.from(urlMatch[1]).toString("base64").slice(0, 12)}`,
    source: "vcoins",
    title: cleanTitle || "VCoins listing",
    description: description || undefined,
    price: Number.isFinite(price) ? price : undefined,
    currency,
    dealer: cleanupText(dealerMatch?.[1] ?? "") || undefined,
    url: urlMatch[1],
    imageUrls: Array.from(new Set(imgMatches)).slice(0, 4),
    raw: { parsedFrom: "search-card" }
  };
}

function normalizeCurrency(symbol?: string): string | undefined {
  if (!symbol) return undefined;
  if (symbol === "$" || symbol === "US$") return "USD";
  return symbol.toUpperCase();
}

function cleanupText(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function absolutizeUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://www.vcoins.com${url}`;
  return url;
}

function dedupeByUrl(listings: CoinListing[]): CoinListing[] {
  const map = new Map<string, CoinListing>();
  for (const listing of listings) {
    if (!map.has(listing.url)) map.set(listing.url, listing);
  }
  return Array.from(map.values());
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
