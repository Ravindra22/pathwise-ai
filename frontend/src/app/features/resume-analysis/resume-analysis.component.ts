import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CareerApiService } from '../../core/career-api.service';
import { CareerDraftService } from '../../core/career-draft.service';
import { SavedPlansService } from '../../core/saved-plans.service';
import { CareerAnalysis } from '../../models/career-analysis';
import { ResumeUploadComponent } from '../resume-upload/resume-upload.component';

@Component({
  selector: 'pw-resume-analysis',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ResumeUploadComponent],
  templateUrl: './resume-analysis.component.html',
  styleUrl: './resume-analysis.component.css'
})
export class ResumeAnalysisComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly careerApi = inject(CareerApiService);
  private readonly router = inject(Router);
  private readonly savedPlans = inject(SavedPlansService);
  private readonly careerDraft = inject(CareerDraftService);
  readonly auth = inject(AuthService);

  readonly form = this.formBuilder.nonNullable.group({
    resume: ['', [Validators.required, Validators.maxLength(24000)]],
    job: ['', [Validators.required, Validators.maxLength(24000)]]
  });
  readonly loading = signal(false);
  readonly analysis = signal<CareerAnalysis | null>(null);
  readonly errorMessage = signal('');
  readonly saveMessage = signal('');
  readonly saving = signal(false);
  private activePlanId: string | null = null;
  get activePlanLabel(): boolean { return Boolean(this.activePlanId); }
  get jobDetailsAreLimited(): boolean {
    const job = this.form.controls.job.value.trim();
    return job.length < 220 || job.split(/\s+/).filter(Boolean).length < 30;
  }

  ngOnInit(): void {
    const draft = this.careerDraft.draft();
    if (draft.resume || draft.job) this.form.patchValue(draft);
    const selectedPlan = this.savedPlans.selectedPlan();
    if (selectedPlan) {
      this.activePlanId = selectedPlan.id;
      this.form.controls.job.setValue(selectedPlan.target_role);
      this.analysis.set(selectedPlan.analysis);
      this.savedPlans.selectedPlan.set(null);
    }
    void this.auth.whenReady().then(() => {
      const pending = this.savedPlans.pendingSave();
      if (pending && this.auth.user()) void this.persist(pending);
    });
  }

  updateDraft(): void {
    this.careerDraft.update(this.form.getRawValue());
  }

  analyze(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.careerDraft.update(this.form.getRawValue());
    this.analysis.set(null);
    this.activePlanId = null;
    this.savedPlans.pendingSave.set(null);
    this.savedPlans.selectedPlan.set(null);
    this.saveMessage.set('');
    this.careerApi.analyze(this.form.getRawValue()).subscribe({
      next: result => {
        this.analysis.set(result);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.messageFor(error));
        this.loading.set(false);
      }
    });
  }

  async saveCurrent(): Promise<void> {
    const analysis = this.analysis();
    const targetRole = this.form.controls.job.value.trim();
    if (!analysis || !targetRole) return;
    const pending = { targetRole, analysis, roadmap: analysis.roadmap, planId: this.activePlanId };
    this.savedPlans.pendingSave.set(pending);
    if (!this.auth.user()) {
      await this.router.navigate(['/login'], { queryParams: { returnUrl: '/analyze' } });
      return;
    }
    await this.persist(pending);
  }

  private async persist(pending: { targetRole: string; analysis: CareerAnalysis; roadmap: CareerAnalysis['roadmap']; planId: string | null }): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveMessage.set('');
    try {
      const saved = await this.savedPlans.save(pending.targetRole, pending.analysis, pending.roadmap, pending.planId);
      this.activePlanId = saved.id;
      this.savedPlans.pendingSave.set(null);
      this.saveMessage.set('Saved to your career plans.');
    } catch {
      this.saveMessage.set('Could not save this plan. Check your connection and try again.');
    } finally { this.saving.set(false); }
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Could not reach Pathwise. Start the existing API server on port 3000, then try again.';
      const apiMessage = typeof error.error?.error === 'string' ? error.error.error : '';
      return apiMessage || 'Pathwise could not complete the analysis. Please try again.';
    }
    return 'Pathwise could not complete the analysis. Please try again.';
  }
}
