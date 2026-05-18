# Docker Optimizer AI

Stateless Dockerfile best-practices advisor.  
It takes a Dockerfile as input, asks Groq LLM for optimization suggestions, and returns:
- Optimized Dockerfile
- Improvement summary
- Risk notes
- Confidence level
- Rule-check score before/after

## Architecture

- Frontend: React + Vite
- API: `/api/optimize` (serverless-style handler)
- LLM provider: Groq Chat Completions API
- Storage: none (stateless, no DB)

## Security Model

- `GROQ_API_KEY` is server-side only.
- Browser never calls Groq directly.
- API has:
  - input size cap
  - request timeout
  - basic in-memory rate limiting
  - JSON schema validation for LLM output

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.local.example .env.local
```

3. Set variables in `.env.local`

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

4. Start app

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Contract

### Request

`POST /api/optimize`

```json
{
  "dockerfile": "FROM node:20\nWORKDIR /app\n...",
  "context": "optional runtime context"
}
```

### Response

```json
{
  "optimizedDockerfile": "...",
  "improvements": ["..."],
  "explanation": "...",
  "detailedChanges": [
    { "original": "...", "optimized": "...", "reason": "..." }
  ],
  "riskNotes": ["..."],
  "confidence": "high",
  "ruleChecks": {
    "before": { "total": 6, "passed": 3, "score": 5, "findings": [] },
    "after": { "total": 6, "passed": 5, "score": 8.3, "findings": [] }
  }
}
```

## Rule Checks (Static)

- Pinned base image versions
- Non-root runtime user
- No obvious secrets in `ARG/ENV`
- Avoid `curl | bash`
- Deterministic install patterns (`npm ci` preference)
- Cache-friendly `COPY` and install ordering

## Deployment (Vercel)

Set these env vars in Vercel project settings:
- `GROQ_API_KEY`
- `GROQ_MODEL` (optional)

Then deploy normally.

## Local Env Behavior

- API server reads env from:
  1. process env (highest priority)
  2. `.env.local`
  3. `.env`
- So if key is in `.env.local`, local `npm run dev` works without manual export.

## Important Limitation

This tool gives AI + static best-practices guidance only.  
It does **not** guarantee runtime build success unless you add a separate build-verification pipeline.
