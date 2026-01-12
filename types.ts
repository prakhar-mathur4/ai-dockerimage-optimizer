
export interface DetailedChange {
  original: string;
  optimized: string;
  reason: string;
}

export interface OptimizationResult {
  optimizedDockerfile: string;
  improvements: string[];
  explanation: string;
  detailedChanges: DetailedChange[];
}

export interface AppState {
  input: string;
  output: OptimizationResult | null;
  isLoading: boolean;
  error: string | null;
}
