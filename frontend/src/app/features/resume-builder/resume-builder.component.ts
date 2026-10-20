import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CareerApiService } from '../../core/career-api.service';
import { ResumeDocumentService } from '../../core/resume-document.service';
import { ResumeBuilderRequest, ResumeBuilderResult } from '../../models/resume-builder';

@Component({
  selector: 'pw-resume-builder',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './resume-builder.component.html',
  styleUrl: './resume-builder.component.css'
})
export class ResumeBuilderComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly careerApi = inject(CareerApiService);
  private readonly resumeDocument = inject(ResumeDocumentService);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(60)]],
    location: ['', [Validators.maxLength(120)]],
    targetRole: ['', [Validators.required, Validators.maxLength(180)]],
    employer: ['', [Validators.maxLength(180)]],
    jobDescription: ['', [Validators.maxLength(10000)]],
    experience: ['', [Validators.maxLength(7000)]],
    extraSkills: ['', [Validators.maxLength(3000)]],
    training: ['', [Validators.maxLength(5000)]],
    otherExperience: ['', [Validators.maxLength(5000)]]
  });

  readonly quickSkills = [
    'Customer service', 'Barcode scanning', 'Handling returns', 'Stocking and sorting',
    'Cash handling or point of sale', 'Cleaning and sanitation', 'Food preparation',
    'Delivery or route work', 'Hand or power tools', 'Equipment operation', 'Basic computer use'
  ];
  readonly selectedSkills = signal<Set<string>>(new Set());
  readonly step = signal(1);
  readonly loading = signal(false);
  readonly result = signal<ResumeBuilderResult | null>(null);
  readonly resumeDraft = signal('');
  readonly confirmed = signal(false);
  readonly errorMessage = signal('');
  readonly downloadMessage = signal('');
  readonly detailsError = signal('');

  continueToDetails(): void {
    this.errorMessage.set('');
    if (this.form.controls.name.invalid || this.form.controls.targetRole.invalid || this.form.controls.email.invalid) {
      this.form.controls.name.markAsTouched();
      this.form.controls.targetRole.markAsTouched();
      this.form.controls.email.markAsTouched();
      return;
    }
    this.step.set(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSkill(skill: string, checked: boolean): void {
    const next = new Set(this.selectedSkills());
    if (checked) next.add(skill);
    else next.delete(skill);
    this.selectedSkills.set(next);
  }

  back(): void {
    if (this.step() === 3) {
      this.result.set(null);
      this.confirmed.set(false);
      this.step.set(2);
    } else if (this.step() === 2) this.step.set(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  generate(): void {
    this.errorMessage.set('');
    this.detailsError.set('');
    this.downloadMessage.set('');
    const value = this.form.getRawValue();
    const skills = [...this.selectedSkills(), value.extraSkills.trim()].filter(Boolean).join(', ');
    if (![value.experience, skills, value.training, value.otherExperience].some(item => item.trim())) {
      this.detailsError.set('Share at least one work example, skill, course, or other experience. A short answer is fine.');
      return;
    }

    const request: ResumeBuilderRequest = {
      name: value.name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      location: value.location.trim(),
      targetRole: value.targetRole.trim(),
      employer: value.employer.trim(),
      jobDescription: value.jobDescription.trim(),
      experience: value.experience.trim(),
      skills,
      training: value.training.trim(),
      otherExperience: value.otherExperience.trim()
    };
    this.loading.set(true);
    this.careerApi.createResume(request).subscribe({
      next: result => {
        this.result.set(result);
        this.resumeDraft.set(result.resume.trim());
        this.confirmed.set(false);
        this.step.set(3);
        this.loading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const apiMessage = typeof error.error?.error === 'string' ? error.error.error : '';
          this.errorMessage.set(error.status === 0
            ? 'Could not reach Pathwise. Start the existing API server on port 3000, then try again.'
            : apiMessage || 'Pathwise could not create this resume. Please try again.');
        } else this.errorMessage.set('Pathwise could not create this resume. Please try again.');
        this.loading.set(false);
      }
    });
  }

  editResume(value: string): void {
    this.resumeDraft.set(value);
    this.confirmed.set(false);
    this.downloadMessage.set('');
  }

  async download(): Promise<void> {
    if (!this.confirmed()) return;
    try {
      await this.resumeDocument.download(this.resumeDraft(), 'pathwise-resume.docx');
      this.downloadMessage.set('Your resume downloaded. Review it once more before applying.');
    } catch {
      this.downloadMessage.set('Could not create the Word file. Your draft is still here; please try again.');
    }
  }
}
