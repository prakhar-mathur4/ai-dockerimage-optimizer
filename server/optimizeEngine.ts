import { evaluateDockerfileRules } from "../lib/dockerRules";
import { ConfidenceLevel, DetailedChange, OptimizationResult } from "../types";
import { loadServerEnv } from "./loadEnv";

loadServerEnv();

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_DOCKERFILE_CHARS = 25_000;

const SYSTEM_PROMPT = `You are a senior Docker security and performance engineer.

Task:
Given any Dockerfile, produce the safest and most reliable optimized version while preserving runtime behavior.

Hard Rules:
1. Return valid JSON only. No markdown, no code fences.
2. Do not invent files, scripts, or paths that are not implied by input.
3. If uncertain about a change, keep original behavior and add a risk note.
4. Prefer minimal, high-confidence edits over aggressive refactors.
5. Never claim build/runtime guarantee.

Optimization Priority (in order):
1. Correctness and runtime safety
2. Security hardening
3. Build reproducibility
4. Layer caching and build speed
5. Image size reduction
6. Maintainability/readability

Universal Security & Reliability Checks:
- Avoid running as root in final stage when feasible.
- Avoid latest tags; prefer pinned versions/digests.
- Avoid secret-like values in ARG/ENV.
- Avoid unsafe patterns like curl | bash unless clearly justified.
- Keep CMD/ENTRYPOINT semantics consistent with original behavior.
- Prefer stable official base images and avoid unnecessary packages/tools.

Language/Ecosystem Detection:
Infer ecosystem from files/commands and apply relevant best practices for common stacks:
- JavaScript/TypeScript (Node)
- Python
- Java
- Go
- Rust
- PHP
- Ruby
- .NET
- C/C++
- Elixir/Erlang

Ecosystem-Aware Rules (apply only when relevant):
- Use deterministic dependency installs with lockfiles.
- Keep dependency-install layers cache-friendly (copy manifest/lock files first, source later).
- Avoid duplicate dependency installation across stages.
- Use multi-stage builds for compile-heavy workloads.
- Keep runtime stage minimal; copy only runtime artifacts.
- Preserve framework/runtime-specific generated assets when required.
- If monorepo/build args are used, keep artifact paths consistent with args.

When NOT to change:
- If Dockerfile is already strong and changes are low-confidence, keep minimal edits.
- Do not force Alpine/distroless/scratch if compatibility is uncertain.

Output JSON schema (exact keys):
{
  "optimizedDockerfile": "string",
  "improvements": ["string"],
  "explanation": "string",
  "detailedChanges": [{"original":"string","optimized":"string","reason":"string"}],
  "riskNotes": ["string"],
  "confidence": "high|medium|low"
}

Quality Requirements:
- improvements must be concrete and technical, not generic.
- detailedChanges must reflect real before/after edits only.
- If critical gaps remain, include them in riskNotes.
- If impact is minor or uncertainty exists, confidence must be medium or low.`;

type OptimizeRequestBody = {
  dockerfile?: unknown;
  context?: unknown;
};

type OptimizationResponsePayload = {
  optimizedDockerfile: string;
  improvements: string[];
  explanation: string;
  detailedChanges: DetailedChange[];
  riskNotes: string[];
  confidence: ConfidenceLevel;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isDetailedChanges = (value: unknown): value is DetailedChange[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as DetailedChange).original === "string" &&
      typeof (item as DetailedChange).optimized === "string" &&
      typeof (item as DetailedChange).reason === "string"
  );
};

const isConfidence = (value: unknown): value is ConfidenceLevel =>
  value === "high" || value === "medium" || value === "low";

const validateOptimizationPayload = (value: unknown): OptimizationResponsePayload | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (
    typeof payload.optimizedDockerfile !== "string" ||
    !isStringArray(payload.improvements) ||
    typeof payload.explanation !== "string" ||
    !isDetailedChanges(payload.detailedChanges) ||
    !isStringArray(payload.riskNotes) ||
    !isConfidence(payload.confidence)
  ) {
    return null;
  }

  return {
    optimizedDockerfile: payload.optimizedDockerfile,
    improvements: payload.improvements,
    explanation: payload.explanation,
    detailedChanges: payload.detailedChanges,
    riskNotes: payload.riskNotes,
    confidence: payload.confidence,
  };
};

const extractJsonFromText = (content: string): string => {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response is not valid JSON.");
  }
  return trimmed.slice(start, end + 1);
};

const unescapeNewlines = (text: string): string => text.replace(/\\n/g, "\n");

const expandChainedDockerOps = (text: string): string => {
  return text.replace(/\s+&&\s+/g, "\n");
};

const normalizeDetailedChanges = (changes: DetailedChange[]): DetailedChange[] => {
  const normalized: DetailedChange[] = [];

  for (const change of changes) {
    const original = expandChainedDockerOps(unescapeNewlines(change.original)).trim();
    const optimized = expandChainedDockerOps(unescapeNewlines(change.optimized)).trim();
    const reason = change.reason.trim();

    const originalLines = original.split("\n").map((line) => line.trim()).filter(Boolean);
    const optimizedLines = optimized.split("\n").map((line) => line.trim()).filter(Boolean);

    if (
      originalLines.length === 1 &&
      optimizedLines.length > 1 &&
      /^copy\s+\.\s+\./i.test(originalLines[0])
    ) {
      for (const optimizedLine of optimizedLines) {
        normalized.push({
          original: originalLines[0],
          optimized: optimizedLine,
          reason,
        });
      }
      continue;
    }

    if (originalLines.length === optimizedLines.length && originalLines.length > 1) {
      for (let index = 0; index < originalLines.length; index += 1) {
        normalized.push({
          original: originalLines[index],
          optimized: optimizedLines[index],
          reason,
        });
      }
      continue;
    }

    if (original && optimized && original !== optimized) {
      normalized.push({ original, optimized, reason });
    }
  }

  const deduped = new Map<string, DetailedChange>();
  for (const change of normalized) {
    const key = `${change.original}|||${change.optimized}|||${change.reason}`;
    deduped.set(key, change);
  }
  return Array.from(deduped.values());
};

const deriveImprovementsFromRules = (
  before: ReturnType<typeof evaluateDockerfileRules>,
  after: ReturnType<typeof evaluateDockerfileRules>
): string[] => {
  const improvements: string[] = [];
  const beforeMap = new Map(before.findings.map((item) => [item.id, item]));
  for (const afterFinding of after.findings) {
    const beforeFinding = beforeMap.get(afterFinding.id);
    if (beforeFinding && !beforeFinding.passed && afterFinding.passed) {
      improvements.push(`Fixed: ${afterFinding.title}`);
    }
  }
  return improvements;
};

const cleanImprovementText = (text: string): string =>
  text
    .replace(/\s+/g, " ")
    .replace(/[.]+$/, "")
    .trim();

const finalizeImprovements = (
  modelImprovements: string[],
  ruleImprovements: string[],
  beforeScore: number,
  afterScore: number
): string[] => {
  const merged = [...ruleImprovements, ...modelImprovements.map(cleanImprovementText)].filter(Boolean);
  const deduped = Array.from(new Set(merged));

  if (afterScore > beforeScore) {
    deduped.unshift(`Static best-practices score improved from ${beforeScore} to ${afterScore}.`);
  }
  if (afterScore === beforeScore) {
    deduped.unshift("No measurable static rule-score improvement in this suggestion.");
  }

  return deduped.slice(0, 8);
};

const buildOptimizationStrategy = (
  beforeScore: number,
  afterScore: number,
  detailedChangesCount: number,
  unresolvedHighRiskCount: number,
  fallbackText: string
): string => {
  if (afterScore > beforeScore) {
    return `Applied ${detailedChangesCount} focused change(s). Static score improved from ${beforeScore} to ${afterScore}. ${
      unresolvedHighRiskCount > 0
        ? "Some high-risk best-practice gaps still remain and should be addressed manually."
        : "No high-risk rule gaps remain in static checks."
    }`;
  }

  if (afterScore === beforeScore) {
    return `Suggestions are mostly structural/refactoring with no static score gain (${beforeScore} to ${afterScore}). Review manually before adopting.`;
  }

  return fallbackText;
};

const callGroq = async (dockerfile: string, context?: unknown): Promise<OptimizationResponsePayload> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY on server.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const contextText = typeof context === "string" ? context.trim() : "";

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        max_completion_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Dockerfile:\n${dockerfile}\n\nOptional context:\n${contextText || "N/A"}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const content = (data.choices as Array<Record<string, unknown>> | undefined)?.[0];
    const message = (content?.message as Record<string, unknown> | undefined)?.content;
    if (typeof message !== "string") {
      throw new Error("Groq response did not include message content.");
    }

    const parsed = JSON.parse(extractJsonFromText(message));
    const validated = validateOptimizationPayload(parsed);
    if (!validated) {
      throw new Error("Groq response failed schema validation.");
    }

    return validated;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeConfidence = (
  modelConfidence: ConfidenceLevel,
  beforeScore: number,
  afterScore: number,
  riskNotes: string[],
  unresolvedHighRiskCount: number
): ConfidenceLevel => {
  const hasHighRisk = riskNotes.some((note) =>
    /high risk|secret|root|latest|unverified|break/i.test(note)
  );

  if (afterScore < beforeScore || hasHighRisk || unresolvedHighRiskCount > 0) {
    return "low";
  }
  if (afterScore === beforeScore) {
    return "medium";
  }
  if (afterScore - beforeScore >= 2 && modelConfidence !== "low") {
    return "high";
  }
  return modelConfidence === "high" ? "medium" : modelConfidence;
};

const buildRiskNotesFromRules = (
  before: ReturnType<typeof evaluateDockerfileRules>,
  after: ReturnType<typeof evaluateDockerfileRules>
): string[] => {
  const notes: string[] = [];
  const failedAfter = after.findings.filter((finding) => !finding.passed);
  const highSeverityFails = failedAfter.filter((finding) => finding.severity === "high");

  if (highSeverityFails.length > 0) {
    notes.push(
      `High-risk best-practice gaps remain: ${highSeverityFails
        .map((item) => item.title)
        .join(", ")}.`
    );
  }
  if (after.score < before.score) {
    notes.push("Suggested Dockerfile reduced static best-practices score and was not applied.");
  }
  if (after.score === before.score) {
    notes.push("Static best-practices score did not improve; changes are mostly stylistic/structural.");
  }
  if (after.score <= 6) {
    notes.push("Static quality score is moderate/low; validate in a real build pipeline.");
  }
  return notes;
};

export const optimizeDockerfileRequest = async (
  body: OptimizeRequestBody
): Promise<{ status: number; payload: OptimizationResult | { error: string } }> => {
  const dockerfile = typeof body.dockerfile === "string" ? body.dockerfile.trim() : "";
  if (!dockerfile) {
    return { status: 400, payload: { error: "dockerfile is required." } };
  }
  if (dockerfile.length > MAX_DOCKERFILE_CHARS) {
    return {
      status: 413,
      payload: { error: `Dockerfile exceeds ${MAX_DOCKERFILE_CHARS} characters.` },
    };
  }

  const beforeRules = evaluateDockerfileRules(dockerfile);

  let modelOutput: OptimizationResponsePayload | null = null;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      modelOutput = await callGroq(dockerfile, body.context);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown optimization error.");
    }
  }

  if (!modelOutput) {
    return {
      status: 502,
      payload: {
        error: `Optimization failed. ${lastError?.message || "Unable to process request."}`,
      },
    };
  }

  const afterCandidateRules = evaluateDockerfileRules(modelOutput.optimizedDockerfile);

  const shouldBlockWorseOutput = afterCandidateRules.score < beforeRules.score;
  const finalDockerfile = shouldBlockWorseOutput ? dockerfile : modelOutput.optimizedDockerfile;
  const afterRules = shouldBlockWorseOutput ? beforeRules : afterCandidateRules;
  const unresolvedHighRiskCount = afterRules.findings.filter(
    (finding) => finding.severity === "high" && !finding.passed
  ).length;
  const normalizedChanges = normalizeDetailedChanges(modelOutput.detailedChanges);
  const ruleImprovements = deriveImprovementsFromRules(beforeRules, afterRules);
  const improvements = finalizeImprovements(
    modelOutput.improvements,
    ruleImprovements,
    beforeRules.score,
    afterRules.score
  );
  const ruleRiskNotes = buildRiskNotesFromRules(beforeRules, afterCandidateRules);
  const mergedRiskNotes = Array.from(
    new Set([...modelOutput.riskNotes.map(cleanImprovementText), ...ruleRiskNotes])
  ).filter(Boolean);
  const confidence = normalizeConfidence(
    modelOutput.confidence,
    beforeRules.score,
    afterRules.score,
    mergedRiskNotes,
    unresolvedHighRiskCount
  );
  const explanation = buildOptimizationStrategy(
    beforeRules.score,
    afterRules.score,
    normalizedChanges.length,
    unresolvedHighRiskCount,
    modelOutput.explanation
  );

  const payload: OptimizationResult = {
    optimizedDockerfile: finalDockerfile,
    improvements,
    explanation,
    detailedChanges: normalizedChanges,
    riskNotes: mergedRiskNotes,
    confidence,
    ruleChecks: {
      before: beforeRules,
      after: afterRules,
    },
  };

  return { status: 200, payload };
};
