import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnalyzeRequest, CareerAnalysis } from '../models/career-analysis';
import { ResumeImprovement } from '../models/resume-improvement';
import { CareerIntroduction, InterviewFeedback, InterviewQuestion } from '../models/interview-prep';
import { ResumeBuilderRequest, ResumeBuilderResult } from '../models/resume-builder';

@Injectable({ providedIn: 'root' })
export class CareerApiService {
  private readonly http = inject(HttpClient);

  analyze(request: AnalyzeRequest): Observable<CareerAnalysis> {
    return this.http.post<CareerAnalysis>('/api/analyze', request);
  }

  improveResume(request: AnalyzeRequest): Observable<ResumeImprovement> {
    return this.http.post<ResumeImprovement>('/api/improve-resume', request);
  }

  createResume(request: ResumeBuilderRequest): Observable<ResumeBuilderResult> {
    return this.http.post<ResumeBuilderResult>('/api/create-resume', request);
  }

  interviewQuestion(request: AnalyzeRequest & { previousQuestions: string[] }): Observable<InterviewQuestion> {
    return this.http.post<InterviewQuestion>('/api/interview-question', request);
  }

  reviewInterview(request: { answer: string; job: string; question: string; category: string }): Observable<InterviewFeedback> {
    return this.http.post<InterviewFeedback>('/api/interview', request);
  }

  introduction(request: AnalyzeRequest & { kind: string }): Observable<CareerIntroduction> {
    return this.http.post<CareerIntroduction>('/api/introduction', request);
  }
}
