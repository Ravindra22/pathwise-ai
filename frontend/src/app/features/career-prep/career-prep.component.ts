import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CareerApiService } from '../../core/career-api.service';
import { CareerDraftService } from '../../core/career-draft.service';
import { CareerIntroduction, InterviewFeedback } from '../../models/interview-prep';
import { ResumeUploadComponent } from '../resume-upload/resume-upload.component';

@Component({
  selector: 'pw-career-prep',
  standalone: true,
  imports: [ReactiveFormsModule, ResumeUploadComponent],
  templateUrl: './career-prep.component.html',
  styleUrl: './career-prep.component.css'
})
export class CareerPrepComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly careerApi = inject(CareerApiService);
  private readonly careerDraft = inject(CareerDraftService);

  readonly form = this.formBuilder.nonNullable.group({
    resume: ['', [Validators.required, Validators.maxLength(24000)]],
    job: ['', [Validators.required, Validators.maxLength(24000)]],
    answer: ['', [Validators.maxLength(8000)]]
  });
  readonly question = signal('');
  readonly questionHistory = signal<string[]>([]);
  readonly feedback = signal<InterviewFeedback | null>(null);
  readonly introduction = signal<CareerIntroduction | null>(null);
  readonly audience = signal<'recruiter' | 'manager' | 'technical'>('recruiter');
  readonly questionLoading = signal(false);
  readonly feedbackLoading = signal(false);
  readonly introLoading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    this.form.patchValue(this.careerDraft.draft());
  }

  updateDraft(): void {
    this.careerDraft.update({ resume: this.form.controls.resume.value, job: this.form.controls.job.value });
  }

  createQuestion(): void {
    this.errorMessage.set('');
    const request = this.getCareerInputs();
    if (!request) return;
    this.questionLoading.set(true);
    this.feedback.set(null);
    this.careerApi.interviewQuestion({ ...request, previousQuestions: this.questionHistory().slice(-5) }).subscribe({
      next: result => {
        this.question.set(result.question);
        this.questionHistory.update(history => [...history, result.question]);
        this.form.controls.answer.setValue('');
        this.questionLoading.set(false);
      },
      error: error => { this.showError(error, 'Could not create an interview question.'); this.questionLoading.set(false); }
    });
  }

  reviewAnswer(): void {
    this.errorMessage.set('');
    const answer = this.form.controls.answer.value.trim();
    if (!answer) {
      this.form.controls.answer.markAsTouched();
      this.errorMessage.set('Add your answer first, using a real example from your experience.');
      return;
    }
    const request = this.getCareerInputs();
    if (!request || !this.question()) return;
    this.feedbackLoading.set(true);
    this.feedback.set(null);
    this.careerApi.reviewInterview({ ...request, answer, question: this.question(), category: 'technical' }).subscribe({
      next: result => { this.feedback.set(result); this.feedbackLoading.set(false); },
      error: error => { this.showError(error, 'Could not review this answer.'); this.feedbackLoading.set(false); }
    });
  }

  craftIntroduction(): void {
    this.errorMessage.set('');
    const request = this.getCareerInputs();
    if (!request) return;
    this.introLoading.set(true);
    this.introduction.set(null);
    this.careerApi.introduction({ ...request, kind: this.audience() }).subscribe({
      next: result => { this.introduction.set(result); this.introLoading.set(false); },
      error: error => { this.showError(error, 'Could not draft your introduction.'); this.introLoading.set(false); }
    });
  }

  async copyIntroduction(): Promise<void> {
    const text = this.introduction()?.introduction;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch { this.errorMessage.set('Copy was blocked by your browser. Select the introduction text to copy it.'); }
  }

  private getCareerInputs(): { resume: string; job: string } | null {
    const { resume, job } = this.form.getRawValue();
    if (!resume.trim() || !job.trim() || this.form.controls.resume.invalid || this.form.controls.job.invalid) {
      this.form.controls.resume.markAsTouched();
      this.form.controls.job.markAsTouched();
      this.errorMessage.set('Add your resume and target job description to personalize practice.');
      return null;
    }
    this.updateDraft();
    return { resume: resume.trim(), job: job.trim() };
  }

  private showError(error: unknown, fallback: string): void {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = typeof error.error?.error === 'string' ? error.error.error : '';
      this.errorMessage.set(error.status === 0 ? 'Could not reach Pathwise. Make sure the local API on port 3000 is running.' : apiMessage || fallback);
    } else this.errorMessage.set(fallback);
  }
}
