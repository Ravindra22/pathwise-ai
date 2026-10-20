import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'analyze' },
  { path: 'analyze', loadComponent: () => import('./features/resume-analysis/resume-analysis.component').then(module => module.ResumeAnalysisComponent) },
  { path: 'resume', loadComponent: () => import('./features/resume-coach/resume-coach.component').then(module => module.ResumeCoachComponent) },
  { path: 'prep', loadComponent: () => import('./features/career-prep/career-prep.component').then(module => module.CareerPrepComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(module => module.LoginComponent) },
  { path: 'plans', loadComponent: () => import('./features/saved-plans/saved-plans.component').then(module => module.SavedPlansComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'analyze' }
];
