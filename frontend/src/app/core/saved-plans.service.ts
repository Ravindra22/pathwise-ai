import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { CareerAnalysis } from '../models/career-analysis';

export interface SavedCareerPlan {
  id: string;
  target_role: string;
  analysis: CareerAnalysis;
  roadmap: { week: string; title: string; detail: string }[];
  progress: Record<string, unknown>;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SavedPlansService {
  private readonly auth = inject(AuthService);
  readonly selectedPlan = signal<SavedCareerPlan | null>(null);
  readonly pendingSave = signal<{ targetRole: string; analysis: CareerAnalysis; roadmap: SavedCareerPlan['roadmap']; planId: string | null } | null>(null);

  async list(): Promise<SavedCareerPlan[]> {
    const userId = this.requireUserId();
    const { data, error } = await this.auth.getClient()
      .from('career_plans')
      .select('id, target_role, analysis, roadmap, progress, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const plans = (data ?? []) as unknown as SavedCareerPlan[];
    const bestByRole = new Map<string, SavedCareerPlan>();
    for (const plan of plans) {
      const key = plan.target_role.trim().toLowerCase();
      const previous = bestByRole.get(key);
      if (!previous || this.completed(plan) > this.completed(previous)) bestByRole.set(key, plan);
    }
    return [...bestByRole.values()];
  }

  async save(targetRole: string, analysis: CareerAnalysis, roadmap: SavedCareerPlan['roadmap'], planId: string | null): Promise<SavedCareerPlan> {
    const userId = this.requireUserId();
    const client = this.auth.getClient();
    const payload = {
      user_id: userId,
      target_role: targetRole.trim(),
      analysis,
      roadmap,
      progress: { completedWeeks: roadmap.map(() => false), evidenceByWeek: roadmap.map(() => ''), taskStepsByWeek: {}, reopenedWeeks: roadmap.map(() => false) }
    };
    if (planId) {
      const { data: prior, error: priorError } = await client.from('career_plans').select('progress').eq('id', planId).eq('user_id', userId).single();
      if (priorError) throw priorError;
      payload.progress = (prior.progress as typeof payload.progress) ?? payload.progress;
      const { data, error } = await client.from('career_plans').update(payload).eq('id', planId).eq('user_id', userId)
        .select('id, target_role, analysis, roadmap, progress, created_at').single();
      if (error) throw error;
      return data as unknown as SavedCareerPlan;
    }
    const { data: existing, error: findError } = await client.from('career_plans').select('id, progress')
      .eq('user_id', userId).eq('target_role', payload.target_role).limit(1).maybeSingle();
    if (findError) throw findError;
    if (existing?.progress) payload.progress = existing.progress as typeof payload.progress;
    const result = existing
      ? await client.from('career_plans').update(payload).eq('id', existing.id).eq('user_id', userId).select('id, target_role, analysis, roadmap, progress, created_at').single()
      : await client.from('career_plans').insert(payload).select('id, target_role, analysis, roadmap, progress, created_at').single();
    if (result.error) throw result.error;
    return result.data as unknown as SavedCareerPlan;
  }

  async delete(planId: string): Promise<void> {
    const userId = this.requireUserId();
    const { error } = await this.auth.getClient().from('career_plans').delete().eq('id', planId).eq('user_id', userId);
    if (error) throw error;
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Sign in to access your saved plans.');
    return userId;
  }

  private completed(plan: SavedCareerPlan): number {
    const weeks = plan.progress?.['completedWeeks'];
    return Array.isArray(weeks) ? weeks.filter(Boolean).length : 0;
  }
}
