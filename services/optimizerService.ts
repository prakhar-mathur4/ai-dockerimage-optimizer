import { OptimizationResult } from "../types";

type OptimizeRequest = {
  dockerfile: string;
  context?: string;
};

type ErrorResponse = { error: string };

const isErrorResponse = (payload: unknown): payload is ErrorResponse => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as Record<string, unknown>).error === "string"
  );
};

export const optimizeDockerfile = async (
  request: OptimizeRequest
): Promise<OptimizationResult> => {
  const response = await fetch("/api/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json();
  if (!response.ok) {
    if (isErrorResponse(payload)) {
      throw new Error(payload.error);
    }
    throw new Error("Optimization API failed.");
  }

  return payload as OptimizationResult;
};
