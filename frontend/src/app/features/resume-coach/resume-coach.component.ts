import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CareerApiService } from '../../core/career-api.service';
import { CareerDraftService } from '../../core/career-draft.service';
import { ResumeDocumentService } from '../../core/resume-document.service';
import { ResumeImprovement } from '../../models/resume-improvement';
import { ResumeUploadComponent } from '../resume-upload/resume-upload.component';

@Component({
  selector: 'pw-resume-coach',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ResumeUploadComponent],
  templateUrl: './resume-coach.component.html',
  styleUrl: './resume-coach.component.css'
})
export class ResumeCoachComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly careerApi = inject(CareerApiService);
  private readonly careerDraft = inject(CareerDraftService);
  private readonly resumeDocument = inject(ResumeDocumentService);

  readonly form = this.formBuilder.nonNullable.group({
    resume: ['', [Validators.required, Validators.maxLength(24000)]],
    job: ['', [Validators.required, Validators.maxLength(24000)]]
  });
  readonly loading = signal(false);
  readonly result = signal<ResumeImprovement | null>(null);
  readonly resumeDraft = signal('');
  readonly summaryReviewed = signal(false);
  readonly confirmedBullets = signal<Set<number>>(new Set());
  readonly draftMessage = signal('');
  readonly draftFocused = signal(false);
  readonly errorMessage = signal('');
  readonly copied = signal(false);
  @ViewChild('resumeDraftEditor') private resumeDraftEditor?: ElementRef<HTMLTextAreaElement>;

  get jobDetailsAreLimited(): boolean {
    const job = this.form.controls.job.value.trim();
    return job.length < 220 || job.split(/\s+/).filter(Boolean).length < 30;
  }

  constructor() {
    this.form.patchValue(this.careerDraft.draft());
  }

  updateDraft(): void {
    this.careerDraft.update(this.form.getRawValue());
  }

  improve(): void {
    this.errorMessage.set('');
    this.result.set(null);
    this.copied.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request = this.form.getRawValue();
    this.careerDraft.update(request);
    this.resumeDraft.set(request.resume.trim());
    this.summaryReviewed.set(false);
    this.confirmedBullets.set(new Set());
    this.draftMessage.set('');
    this.draftFocused.set(false);
    this.loading.set(true);
    this.careerApi.improveResume(request).subscribe({
      next: result => { this.result.set(result); this.loading.set(false); },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const apiMessage = typeof error.error?.error === 'string' ? error.error.error : '';
          this.errorMessage.set(error.status === 0
            ? 'Could not reach Pathwise. Start the existing API server on port 3000, then try again.'
            : apiMessage || 'Pathwise could not improve this resume. Please try again.');
        } else this.errorMessage.set('Pathwise could not improve this resume. Please try again.');
        this.loading.set(false);
      }
    });
  }

  async copySummary(): Promise<void> {
    const summary = this.result()?.summary;
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      this.copied.set(true);
    } catch {
      this.errorMessage.set('Copy was blocked by the browser. Select the summary text to copy it.');
    }
  }

  confirmBullet(index: number, confirmed: boolean): void {
    const next = new Set(this.confirmedBullets());
    if (confirmed) next.add(index);
    else next.delete(index);
    this.confirmedBullets.set(next);
  }

  insertSuggestion(text: string): void {
    const current = this.resumeDraft();
    const editor = this.resumeDraftEditor?.nativeElement;
    const start = this.draftFocused() && editor ? editor.selectionStart : current.length;
    const end = this.draftFocused() && editor ? editor.selectionEnd : current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const suffix = after && !after.startsWith('\n') ? '\n' : '';
    const inserted = `${prefix}${text.trim()}${suffix}`;
    this.resumeDraft.set(`${before}${inserted}${after}`);
    this.draftMessage.set('Added at the cursor in your draft. Review the wording and surrounding sections before downloading.');
    if (editor) {
      queueMicrotask(() => {
        editor.focus();
        const cursor = before.length + inserted.length;
        editor.setSelectionRange(cursor, cursor);
      });
    }
  }

  addReviewedSummary(summary: string): void {
    if (!this.summaryReviewed()) return;
    const lines = this.resumeDraft().replace(/\r/g, '').split('\n');
    const summaryHeadings = new Set(['professional summary', 'summary', 'career summary', 'profile', 'objective']);
    const headingIndex = lines.findIndex(line => summaryHeadings.has(line.trim().replace(/[:\s]+$/, '').toLowerCase()));
    if (headingIndex >= 0) {
      let nextSection = lines.length;
      for (let i = headingIndex + 1; i < lines.length; i++) {
        if (this.isSectionHeading(lines[i])) { nextSection = i; break; }
      }
      lines.splice(headingIndex + 1, nextSection - headingIndex - 1, summary.trim(), '');
    } else {
      const contentLines = lines.filter(line => line.trim());
      const contactIndex = lines.findIndex((line, index) => index > 0 && this.looksLikeContactLine(line));
      const insertAt = contactIndex >= 0
        ? contactIndex + 1
        : Math.min(lines.length, Math.max(1, lines.findIndex(line => line.trim()) + 2));
      lines.splice(insertAt, 0, '', 'PROFESSIONAL SUMMARY', summary.trim(), '');
      if (!contentLines.length) {
        this.draftMessage.set('Add resume content before adding a professional summary.');
        return;
      }
    }
    this.resumeDraft.set(lines.join('\n').replace(/\n{3,}/g, '\n\n'));
    this.draftMessage.set('Added your reviewed summary to the Professional Summary section. Review the full resume before downloading.');
  }

  async downloadResume(): Promise<void> {
    const content = this.resumeDraft().trim();
    if (!content) {
      this.draftMessage.set('Add resume content to the draft before downloading.');
      return;
    }
    try {
      await this.resumeDocument.download(content, 'pathwise-ats-resume.docx');
      this.draftMessage.set('Your ATS-friendly Word resume downloaded. Review every claim, contact detail, and page break before applying.');
    } catch {
      this.draftMessage.set('Could not create the Word file. Your draft is still here; please try again.');
    }
  }

  private looksLikeContactLine(line: string): boolean {
    return /@|\+?\d[\d\s().-]{6,}|linkedin\.com|github\.com|https?:\/\//i.test(line);
  }

  private isSectionHeading(line: string): boolean {
    const headings = new Set(['professional summary', 'summary', 'career summary', 'profile', 'objective', 'experience', 'work experience', 'professional experience', 'employment history', 'education', 'skills', 'technical skills', 'core competencies', 'certifications', 'licenses', 'projects', 'selected projects', 'achievements', 'awards', 'publications', 'volunteer experience', 'additional information', 'languages']);
    const normalized = line.trim().replace(/[:\s]+$/, '').toLowerCase();
    const label = line.trim().replace(/[:\s]+$/, '');
    return headings.has(normalized) || (label.length <= 42 && label === label.toUpperCase() && /[A-Z]/.test(label));
  }

}
