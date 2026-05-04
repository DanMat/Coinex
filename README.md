# coin-search-api

API-first Next.js (App Router) service for searching and evaluating ancient coin listings.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your local env file:
   ```bash
   cp .env.example .env
   ```
3. Set your real OpenAI key in `.env`:
   ```env
   OPENAI_API_KEY=your_real_key_here
   ```

## Run locally

```bash
npm run dev
```

Service runs on `http://localhost:3000`.

## Deploy to Vercel

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add environment variable `OPENAI_API_KEY` in Vercel Project Settings.
4. Deploy.

## Endpoints

### `GET /api/health`
Returns service status.

### `POST /api/search`
Search normalized listings.

### `POST /api/analyze`
Analyze a single listing with OpenAI vision.

### `POST /api/search-and-analyze`
Search listings, optionally analyze top results (`analyzeImages` defaults to `false`).

### `POST /api/listing/extract`
Extract listing details from a direct URL.

## curl examples

```bash
curl -s http://localhost:3000/api/health
```

```bash
curl -s -X POST http://localhost:3000/api/search \
  -H 'content-type: application/json' \
  -d '{"query":"pontius pilate prutah","sources":["vcoins"],"limit":5}'
```

```bash
curl -s -X POST http://localhost:3000/api/search-and-analyze \
  -H 'content-type: application/json' \
  -d '{"query":"widow mite","analyzeImages":true,"collectionProfile":"bible-era","limit":5}'
```

## Current limitations

- MA-Shops provider is a placeholder pending compliant public integration.
- VCoins extraction/search parsing is conservative and may fall back to mock data if page formats change.
- Evaluation is photo-based and does **not** authenticate coins.
- OpenAI analysis is cached by listing URL and limited to max 5 listings / 2 images each for cost control.

## Next steps

- Harden VCoins parser with robust selectors and structured extraction.
- Add MA-Shops public integration once robots/selectors are validated.
- Add durable shared cache (Redis/KV) for serverless multi-instance deployments.
- Add optional auth, request logging, and usage quotas.
