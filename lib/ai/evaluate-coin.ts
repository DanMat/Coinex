import OpenAI from "openai";
import { SimpleCache } from "@/lib/cache/simple-cache";
import { getCollectionProfile } from "@/lib/scoring/collection-profiles";
import { CoinEvaluation, CoinListing } from "@/lib/types";

const analysisCache = new SimpleCache<CoinEvaluation>(24 * 60 * 60 * 1000);

function fallbackEvaluation(listing: CoinListing, profileId?: string): CoinEvaluation {
  const profile = getCollectionProfile(profileId);
  const title = listing.title.toLowerCase();
  const fitHits = profile.priorities.filter((p) => title.includes(p.toLowerCase().split(" ")[0])).length;
  const storyFitScore = profile.id === "none" ? undefined : Math.min(95, 45 + fitHits * 12);
  const duplicatePenalty = title.includes("widow") ? 18 : 0;
  const visualScore = 60;
  const riskScore = 42 + duplicatePenalty;
  return {
    visualScore,
    storyFitScore,
    priceConfidenceScore: 40,
    riskScore,
    overallRecommendation: riskScore > 55 ? "MAYBE" : "BUY",
    summary: "Fallback evaluation generated without image model output.",
    strengths: ["Listing includes at least one image or descriptive title.", "Suitable as an initial screening candidate."],
    concerns: ["Photo-based assessment unavailable due to missing API key or model response.", "No authenticity guarantee; requires expert review."],
    collectionFit: profile.id === "none" ? "No collection profile selected." : `Profile match evaluated for ${profile.name}.`,
    priceNotes: "Price confidence is limited without complete comparables and high-resolution imagery.",
    imageAssessmentLimitations:
      "Photo-based visual assessment only; not an authentication, metallurgy test, or in-hand inspection."
  };
}

export async function evaluateCoinListing(listing: CoinListing, profileId?: string): Promise<CoinEvaluation> {
  const cacheKey = `${listing.url}::${profileId ?? "default"}`;
  const cached = analysisCache.get(cacheKey);
  if (cached) return cached;

  if (!process.env.OPENAI_API_KEY) {
    const out = fallbackEvaluation(listing, profileId);
    analysisCache.set(cacheKey, out);
    return out;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imageUrls = listing.imageUrls.slice(0, 2);
  const profile = getCollectionProfile(profileId);

  const prompt = `You are evaluating an ancient coin listing for a collector profile.
Return strict JSON only matching keys:
visualScore, storyFitScore, priceConfidenceScore, riskScore, overallRecommendation, summary, strengths, concerns, collectionFit, priceNotes, imageAssessmentLimitations.
Rules:
- Scores are 0-100 integers.
- overallRecommendation one of BUY/MAYBE/SKIP.
- Must explicitly state this is photo-based visual assessment only and not authentication.
- Consider centering, wear, strike, surfaces, patina, legibility, eye appeal, display quality, cleaning/tooling/smoothing risks, and photo sufficiency.
- Profile name: ${profile.name}
- Profile priorities: ${profile.priorities.join("; ") || "none"}
- Owned coins: ${profile.ownedCoins.join("; ") || "none"}
- Do not strongly recommend similar Widow's Mite unless clearly a major upgrade.`;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "user", content: [{ type: "input_text", text: `${prompt}\nListing JSON: ${JSON.stringify(listing)}` }] },
        ...imageUrls.map((img) => ({ role: "user" as const, content: [{ type: "input_image" as const, image_url: img }] }))
      ],
      text: { format: { type: "json_object" } }
    });

    const parsed = JSON.parse(response.output_text) as CoinEvaluation;
    analysisCache.set(cacheKey, parsed);
    return parsed;
  } catch {
    const out = fallbackEvaluation(listing, profileId);
    analysisCache.set(cacheKey, out);
    return out;
  }
}
