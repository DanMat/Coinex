import { CoinListing, SearchParams } from "@/lib/types";

export class MockProvider {
  async search(params: SearchParams): Promise<CoinListing[]> {
    return [
      {
        id: `mock-${params.query.toLowerCase().replace(/\s+/g, "-")}`,
        source: "manual",
        title: `Mock ancient coin result for ${params.query}`,
        description: "Fallback mock listing used when external providers are unavailable.",
        price: 120,
        currency: "USD",
        dealer: "Mock Dealer",
        url: "https://example.com/mock-listing",
        imageUrls: ["https://images.vcoins.com/product_image/123/mock.jpg"]
      }
    ];
  }
}
