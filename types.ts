
export interface DetailedChange {
  original: string;
  optimized: string;
  reason: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type RuleSeverity = 'high' | 'medium' | 'low';

export interface RuleFinding {
  id: string;
  title: string;
  severity: RuleSeverity;
  passed: boolean;
  details: string;
}

export interface RuleSummary {
  total: number;
  passed: number;
  score: number;
  findings: RuleFinding[];
}

export interface OptimizationResult {
  optimizedDockerfile: string;
  improvements: string[];
  explanation: string;
  detailedChanges: DetailedChange[];
  riskNotes: string[];
  confidence: ConfidenceLevel;
  ruleChecks: {
    before: RuleSummary;
    after: RuleSummary;
  };
}

export interface AppState {
  input: string;
  output: OptimizationResult | null;
  isLoading: boolean;
  error: string | null;
}
