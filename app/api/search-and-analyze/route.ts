import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateCoinListing } from "@/lib/ai/evaluate-coin";
import { MaShopsProvider } from "@/lib/providers/ma-shops-provider";
import { VCoinsProvider } from "@/lib/providers/vcoins-provider";
import { SearchSource } from "@/lib/types";

const schema = z.object({
  query: z.string().min(1),
  sources: z.array(z.enum(["vcoins", "ma-shops"])).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().int().positive().max(50).optional(),
  collectionProfile: z.string().optional(),
  analyzeImages: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { query, minPrice, maxPrice, collectionProfile, analyzeImages = false, limit = 10, sources = ["vcoins", "ma-shops"] } = parsed.data;
  const providers = { vcoins: new VCoinsProvider(), "ma-shops": new MaShopsProvider() };

  const listings = [];
  for (const source of sources as SearchSource[]) {
    listings.push(...(await providers[source].search({ query, minPrice, maxPrice, limit })));
  }

  const trimmed = listings.slice(0, limit);

  if (!analyzeImages) {
    return NextResponse.json({ results: trimmed.map((listing) => ({ listing })) });
  }

  const maxAnalyze = Math.min(5, trimmed.length);
  const evaluations = await Promise.all(
    trimmed.slice(0, maxAnalyze).map(async (listing) => ({
      listing,
      evaluation: await evaluateCoinListing(
        { ...listing, imageUrls: listing.imageUrls.slice(0, 2) },
        collectionProfile
      )
    }))
  );

  const notAnalyzed = trimmed.slice(maxAnalyze).map((listing) => ({ listing }));
  return NextResponse.json({ results: [...evaluations, ...notAnalyzed] });
}
