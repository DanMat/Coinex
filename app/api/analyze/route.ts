import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateCoinListing } from "@/lib/ai/evaluate-coin";

const listingSchema = z.object({
  id: z.string(),
  source: z.enum(["vcoins", "ma-shops", "manual"]),
  title: z.string(),
  description: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  dealer: z.string().optional(),
  url: z.string().url(),
  imageUrls: z.array(z.string().url()),
  listedAt: z.string().optional()
});

const schema = z.object({
  listing: listingSchema,
  collectionProfile: z.string().optional()
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const evaluation = await evaluateCoinListing(parsed.data.listing, parsed.data.collectionProfile);
  return NextResponse.json({ evaluation });
}
