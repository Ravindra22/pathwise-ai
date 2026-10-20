import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SavedCareerPlan, SavedPlansService } from '../../core/saved-plans.service';

@Component({
  selector: 'pw-saved-plans',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './saved-plans.component.html',
  styleUrl: './saved-plans.component.css'
})
export class SavedPlansComponent implements OnInit {
  private readonly savedPlans = inject(SavedPlansService);
  private readonly router = inject(Router);
  readonly plans = signal<SavedCareerPlan[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly deletingId = signal('');

  ngOnInit(): void { void this.refresh(); }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try { this.plans.set(await this.savedPlans.list()); }
    catch { this.errorMessage.set('Could not load saved plans. Check your connection and try again.'); }
    finally { this.loading.set(false); }
  }

  open(plan: SavedCareerPlan): void {
    this.savedPlans.selectedPlan.set(plan);
    void this.router.navigateByUrl('/analyze');
  }

  async remove(plan: SavedCareerPlan): Promise<void> {
    if (!window.confirm(`Delete the saved plan for “${plan.target_role}”?`)) return;
    this.deletingId.set(plan.id);
    try {
      await this.savedPlans.delete(plan.id);
      this.plans.update(plans => plans.filter(item => item.id !== plan.id));
    } catch { this.errorMessage.set('Could not delete this plan. Please try again.'); }
    finally { this.deletingId.set(''); }
  }

  completed(plan: SavedCareerPlan): number {
    const weeks = plan.progress?.['completedWeeks'];
    return Array.isArray(weeks) ? weeks.filter(Boolean).length : 0;
  }

  dateLabel(date: string): string {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
  }
}
