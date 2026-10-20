export interface ResumeBuilderRequest {
  name: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  employer: string;
  jobDescription: string;
  experience: string;
  skills: string;
  training: string;
  otherExperience: string;
}

export interface ResumeBuilderResult {
  resume: string;
  note: string;
}
