import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CareerApiService } from '../../core/career-api.service';
import { CareerDraftService } from '../../core/career-draft.service';
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
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const paragraphs = this.toWordParagraphs(content);
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
      zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="450" w:footer="450" w:gutter="0"/></w:sectPr></w:body></w:document>`);
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pathwise-ats-resume.docx';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.draftMessage.set('Your ATS-friendly Word resume downloaded. Review every claim, contact detail, and page break before applying.');
    } catch {
      this.draftMessage.set('Could not create the Word file. Your draft is still here; please try again.');
    }
  }

  private toWordParagraphs(content: string): string {
    const headings = new Set([
      'professional summary', 'summary', 'career summary', 'profile', 'objective',
      'experience', 'work experience', 'professional experience', 'employment history',
      'education', 'skills', 'technical skills', 'core competencies', 'certifications',
      'licenses', 'projects', 'selected projects', 'achievements', 'awards',
      'publications', 'volunteer experience', 'additional information', 'languages'
    ]);
    const lines = content.replace(/\r/g, '').split('\n');
    let firstText = true;
    let secondText = true;
    return lines.map(rawLine => {
      const line = rawLine.trim();
      if (!line) return '<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>';
      const escaped = this.xmlEscape(line);
      if (firstText) {
        firstText = false;
        return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/><w:keepNext/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="173454"/><w:sz w:val="34"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
      }
      if (secondText) {
        secondText = false;
        if (this.looksLikeContactLine(line)) {
          return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/><w:keepNext/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="526174"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
        }
      }
      const isHeading = this.isSectionHeading(line, headings);
      if (isHeading) {
        return `<w:p><w:pPr><w:spacing w:before="220" w:after="75"/><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="5" w:space="3" w:color="9CB5B2"/></w:pBdr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="24556A"/><w:sz w:val="22"/><w:caps/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
      }
      const isBullet = /^[•●▪*-]\s+/.test(line);
      const body = isBullet ? line.replace(/^[•●▪*-]\s+/, '') : line;
      const bulletRun = isBullet ? '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>• </w:t></w:r>' : '';
      const indent = isBullet ? '<w:ind w:left="360" w:hanging="180"/>' : '';
      return `<w:p><w:pPr><w:spacing w:after="85" w:line="264" w:lineRule="auto"/><w:widowControl/>${indent}</w:pPr>${bulletRun}<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="263445"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${this.xmlEscape(body)}</w:t></w:r></w:p>`;
    }).join('');
  }

  private looksLikeContactLine(line: string): boolean {
    return /@|\+?\d[\d\s().-]{6,}|linkedin\.com|github\.com|https?:\/\//i.test(line);
  }

  private isSectionHeading(line: string, headings = new Set(['professional summary', 'summary', 'career summary', 'profile', 'objective', 'experience', 'work experience', 'professional experience', 'employment history', 'education', 'skills', 'technical skills', 'core competencies', 'certifications', 'licenses', 'projects', 'selected projects', 'achievements', 'awards', 'publications', 'volunteer experience', 'additional information', 'languages'])): boolean {
    const normalized = line.trim().replace(/[:\s]+$/, '').toLowerCase();
    const label = line.trim().replace(/[:\s]+$/, '');
    return headings.has(normalized) || (label.length <= 42 && label === label.toUpperCase() && /[A-Z]/.test(label));
  }

  private xmlEscape(value: string): string {
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
