import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MaShopsProvider } from "@/lib/providers/ma-shops-provider";
import { VCoinsProvider } from "@/lib/providers/vcoins-provider";

const schema = z.object({ url: z.string().url() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { url } = parsed.data;
  const provider = url.includes("vcoins.com") ? new VCoinsProvider() : new MaShopsProvider();
  const listing = await provider.extract(url);

  if (!listing) {
    return NextResponse.json({
      id: "manual-unknown",
      source: "manual",
      title: "Manual extraction required",
      description: "TODO: Provider extraction unavailable or blocked for this URL.",
      url,
      imageUrls: []
    });
  }

  return NextResponse.json(listing);
}
