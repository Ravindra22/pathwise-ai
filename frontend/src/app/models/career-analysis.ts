export interface CareerAnalysis {
  score: number;
  label: string;
  edgeTitle: string;
  edgeCopy: string;
  gapTitle: string;
  gapCopy: string;
  matched: string[];
  requiredKeywords: string[];
  strengths: { name: string; resourceUrl: string }[];
  gaps: string[];
  roadmap: { week: string; title: string; detail: string }[];
}

export interface AnalyzeRequest {
  resume: string;
  job: string;
}
