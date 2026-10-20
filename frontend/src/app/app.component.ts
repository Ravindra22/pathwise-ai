import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'pw-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-frame">
      <header class="site-header">
        <a class="brand" routerLink="/analyze" aria-label="Pathwise home"><span class="brand-mark">↗</span><span>pathwise</span><small>AI CAREER COPILOT</small></a>
        <nav aria-label="Main navigation"><a class="nav-link" routerLink="/analyze" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Resume match</a><a class="nav-link" routerLink="/resume" routerLinkActive="nav-active" ariaCurrentWhenActive="page">Resume coach</a><a class="nav-link" routerLink="/prep" routerLinkActive="nav-active" ariaCurrentWhenActive="page">Career prep</a>@if (auth.user()) { <a class="nav-link" routerLink="/plans" routerLinkActive="nav-active" ariaCurrentWhenActive="page">Saved plans</a><button class="nav-button" type="button" (click)="signOut()">Sign out</button> } @else { <a class="nav-link" routerLink="/login" routerLinkActive="nav-active" ariaCurrentWhenActive="page">Sign in</a> }</nav>
      </header>
      @if (signOutError()) { <p class="signout-error" role="alert">{{ signOutError() }}</p> }
      <main><router-outlet /></main>
      <footer><span>PATHWISE · CAREER CLARITY, ONE STEP AT A TIME</span><span>AI suggestions are a starting point. Keep every claim true to your experience.</span></footer>
    </div>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly signOutError = signal('');

  constructor() { void this.auth.initialize(); }

  async signOut(): Promise<void> {
    this.signOutError.set('');
    try { await this.auth.signOut(); }
    catch { this.signOutError.set('Could not sign out. Try again.'); }
  }
}
