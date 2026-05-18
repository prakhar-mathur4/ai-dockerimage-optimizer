import { optimizeDockerfileRequest } from "../server/optimizeEngine";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const ipBucket = new Map<string, { count: number; windowStart: number }>();

const getClientIp = (req: any): string => {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const bucket = ipBucket.get(ip);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    ipBucket.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  bucket.count += 1;
  return false;
};

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  if (isRateLimited(getClientIp(req))) {
    res.status(429).json({ error: "Too many requests. Try again in one minute." });
    return;
  }

  try {
    const parsedBody =
      typeof req.body === "string" ? (JSON.parse(req.body) as Record<string, unknown>) : req.body;
    const result = await optimizeDockerfileRequest(parsedBody ?? {});
    res.status(result.status).json(result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({ error: message });
  }
}
