export interface ResumeImprovement {
  summary: string;
  bullets: { text: string; evidence: string; needsInput: boolean }[];
  keywords: string[];
  note: string;
}
