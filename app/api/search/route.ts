import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MaShopsProvider } from "@/lib/providers/ma-shops-provider";
import { MockProvider } from "@/lib/providers/mock-provider";
import { VCoinsProvider } from "@/lib/providers/vcoins-provider";
import { CoinListing, SearchSource } from "@/lib/types";

const schema = z.object({
  query: z.string().min(1),
  sources: z.array(z.enum(["vcoins", "ma-shops"])).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().int().positive().max(50).optional()
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { query, sources = ["vcoins", "ma-shops"], minPrice, maxPrice, limit = 10 } = parsed.data;
  const providers = { vcoins: new VCoinsProvider(), "ma-shops": new MaShopsProvider() };

  const results: CoinListing[] = [];
  for (const source of sources as SearchSource[]) {
    const provider = providers[source];
    const items = await provider.search({ query, minPrice, maxPrice, limit });
    results.push(...items);
  }

  if (results.length === 0) {
    results.push(...(await new MockProvider().search({ query, minPrice, maxPrice, limit })));
  }

  return NextResponse.json({ results: results.slice(0, limit) });
}
