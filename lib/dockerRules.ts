import { RuleFinding, RuleSummary } from "../types";

const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

const hasPinnedTag = (fromLine: string): boolean => {
  const normalized = fromLine.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  if (parts.length < 2) {
    return false;
  }
  const image = parts[1];
  if (image.includes("@sha256:")) {
    return true;
  }
  const lastSegment = image.split("/").pop() || image;
  return lastSegment.includes(":") && !lastSegment.endsWith(":latest");
};

const hasNonRootUser = (dockerfile: string): boolean => {
  const matches = dockerfile.match(/^\s*USER\s+([^\s#]+).*/gim);
  if (!matches || matches.length === 0) {
    return false;
  }
  const lastUserLine = matches[matches.length - 1] || "";
  const user = lastUserLine.replace(/^\s*USER\s+/i, "").trim().toLowerCase();
  return user !== "root" && user !== "0" && user !== "0:0";
};

const hasSecretsInEnvOrArg = (dockerfile: string): boolean => {
  const pattern =
    /^\s*(ENV|ARG)\s+[^#\n]*(token|secret|password|passwd|api[_-]?key|private[_-]?key)[^#\n]*$/gim;
  return pattern.test(dockerfile);
};

const usesCurlPipeShell = (dockerfile: string): boolean => {
  return /curl[^|\n]*\|\s*(bash|sh)/i.test(dockerfile);
};

const prefersDeterministicNodeInstall = (dockerfile: string): boolean => {
  if (!/\bnpm\s+install\b/i.test(dockerfile)) {
    return true;
  }
  return /\bnpm\s+ci\b/i.test(dockerfile);
};

const hasCacheFriendlyCopyOrder = (dockerfile: string): boolean => {
  const lines = dockerfile
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);

  const copyAllIndex = lines.findIndex((line) => /^copy\s+\.\s+\./.test(line));
  const installIndex = lines.findIndex((line) => /\bnpm\s+(install|ci)\b/.test(line));
  const copyManifestIndex = lines.findIndex(
    (line) =>
      /^copy\s+/.test(line) &&
      /(package\*?\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)/.test(line)
  );

  if (installIndex === -1 || copyAllIndex === -1) {
    return true;
  }
  if (copyManifestIndex === -1) {
    return false;
  }
  return copyManifestIndex < installIndex && installIndex < copyAllIndex;
};

export const evaluateDockerfileRules = (dockerfile: string): RuleSummary => {
  const fromLines = dockerfile.match(/^\s*FROM\s+.+$/gim) || [];
  const allFromLinesPinned = fromLines.length > 0 && fromLines.every(hasPinnedTag);
  const nonRootUser = hasNonRootUser(dockerfile);
  const secretLeakage = hasSecretsInEnvOrArg(dockerfile);
  const curlPipeShell = usesCurlPipeShell(dockerfile);
  const deterministicInstall = prefersDeterministicNodeInstall(dockerfile);
  const cacheFriendlyLayering = hasCacheFriendlyCopyOrder(dockerfile);

  const findings: RuleFinding[] = [
    {
      id: "pinned-base-image",
      title: "Pinned base image versions",
      severity: "high",
      passed: allFromLinesPinned,
      details: allFromLinesPinned
        ? "Base image versions are pinned."
        : "One or more FROM instructions are unpinned or use latest.",
    },
    {
      id: "non-root-user",
      title: "Non-root runtime user",
      severity: "high",
      passed: nonRootUser,
      details: nonRootUser
        ? "A non-root USER is configured."
        : "No non-root USER found in final stages.",
    },
    {
      id: "secret-leakage",
      title: "No secrets in ARG/ENV",
      severity: "high",
      passed: !secretLeakage,
      details: secretLeakage
        ? "Potential secret-like key found in ARG/ENV."
        : "No obvious secret-like ARG/ENV values found.",
    },
    {
      id: "no-curl-pipe-shell",
      title: "Avoid curl|bash style execution",
      severity: "high",
      passed: !curlPipeShell,
      details: curlPipeShell
        ? "curl piped to shell detected."
        : "No curl piped to shell detected.",
    },
    {
      id: "deterministic-installs",
      title: "Deterministic Node installs",
      severity: "medium",
      passed: deterministicInstall,
      details: deterministicInstall
        ? "Install command is deterministic or not applicable."
        : "npm install found; prefer npm ci for reproducible builds.",
    },
    {
      id: "cache-friendly-layering",
      title: "Cache-friendly COPY and install order",
      severity: "medium",
      passed: cacheFriendlyLayering,
      details: cacheFriendlyLayering
        ? "Layer ordering appears cache-friendly."
        : "Dependency manifests should be copied before install and full source copy.",
    },
  ];

  const total = findings.length;
  const passed = findings.filter((finding) => finding.passed).length;
  const score = roundToOneDecimal((passed / total) * 10);

  return {
    total,
    passed,
    score,
    findings,
  };
};
