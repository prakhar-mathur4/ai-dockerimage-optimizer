import type { IncomingMessage, ServerResponse } from "http";
import type { Plugin } from "vite";
import { optimizeDockerfileRequest } from "./optimizeEngine";

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
};

const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export const devOptimizeApiPlugin = (): Plugin => {
  return {
    name: "dev-optimize-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/optimize")) {
          next();
          return;
        }

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed. Use POST." });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const result = await optimizeDockerfileRequest((body as Record<string, unknown>) || {});
          sendJson(res, result.status, result.payload);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected server error.";
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
};
