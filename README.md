# Docker Optimizer AI

Stateless Dockerfile best-practices advisor powered by Groq.
It takes a Dockerfile as input and returns:
- Optimized Dockerfile
- Key improvements
- Risk notes
- Confidence
- Static rule-check scores
- YAML and JSON exports

## What It Does

- Analyzes Dockerfiles for common best-practice issues
- Suggests safer, more reproducible optimizations
- Scores the original and optimized Dockerfile with static rule checks
- Keeps the app stateless, with no database or user storage

## Architecture

- Frontend: React + Vite
- Styling: Local Tailwind CSS via PostCSS
- API: `/api/optimize`
- Health check: `/api/health`
- LLM provider: Groq Chat Completions API
- Storage: none

## Security Model

- `GROQ_API_KEY` is server-side only
- The browser never calls Groq directly
- API hardening includes:
  - input size cap
  - request timeout
  - basic in-memory rate limiting
  - strict JSON validation for model output
  - prompt-injection hardening for Dockerfile/context input

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.local.example .env.local
```

3. Set values in `.env.local`

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - build production bundle
- `npm run preview` - preview production build locally
- `npm run typecheck` - run TypeScript type check

## API Contract

### `POST /api/optimize`

Request body:

```json
{
  "dockerfile": "FROM node:20\nWORKDIR /app\n...",
  "context": "optional runtime context"
}
```

Response:

```json
{
  "optimizedDockerfile": "...",
  "improvements": ["..."],
  "explanation": "...",
  "detailedChanges": [
    {
      "original": "...",
      "optimized": "...",
      "reason": "..."
    }
  ],
  "riskNotes": ["..."],
  "confidence": "high",
  "ruleChecks": {
    "before": {
      "total": 6,
      "passed": 3,
      "score": 5,
      "findings": []
    },
    "after": {
      "total": 6,
      "passed": 5,
      "score": 8.3,
      "findings": []
    }
  }
}
```

### `GET /api/health`

Returns a lightweight deployment check:

```json
{
  "ok": true,
  "service": "docker-optimizer-ai",
  "hasGroqKey": true,
  "model": "llama-3.3-70b-versatile",
  "timestamp": "..."
}
```

## Rule Checks

The app applies static checks for:
- Pinned base image versions
- Non-root runtime user
- No obvious secrets in `ARG`/`ENV`
- Avoiding `curl | bash`
- Deterministic install patterns
- Cache-friendly `COPY` and install ordering

## Deployment

### Vercel

Set these environment variables in the Vercel project settings:
- `GROQ_API_KEY`
- `GROQ_MODEL` (optional)

The repo includes:
- `vercel.json` with API timeout and security headers
- `/api/health` for post-deploy verification

### Post-deploy checks

1. Open `GET /api/health`
2. Confirm `hasGroqKey` is `true`
3. Send a sample `POST /api/optimize`
4. Confirm the response is valid JSON with optimized output

## Current Limitations

- The app does not guarantee runtime build success
- It is recommendation-based, not a verified build pipeline
- It does not use a database
- `Optimization Strategy` and `Quality Signal` were intentionally removed from the UI to keep the interface focused
- User-supplied Dockerfiles and context are treated as untrusted data, not instructions

## Notes

- `logo.png` is used in the header and favicon
- The app uses local Tailwind CSS, not the CDN runtime script
