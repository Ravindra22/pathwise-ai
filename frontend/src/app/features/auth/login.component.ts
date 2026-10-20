import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type LoginMode = 'signin' | 'signup' | 'forgot' | 'reset';

@Component({
  selector: 'pw-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly mode = signal<LoginMode>('signin');
  readonly loading = signal(false);
  readonly message = signal('');
  readonly messageType = signal<'success' | 'error'>('success');
  private returnUrl = '/plans';

  readonly form = this.formBuilder.nonNullable.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    confirmPassword: ['']
  });

  constructor() {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    if (requested?.startsWith('/') && !requested.startsWith('//')) this.returnUrl = requested;
    void this.auth.whenReady().then(() => {
      if (this.auth.recoveryMode()) this.mode.set('reset');
      else if (this.auth.user()) void this.router.navigateByUrl(this.returnUrl);
    });
  }

  setMode(mode: LoginMode): void {
    this.mode.set(mode);
    this.message.set('');
    if (mode === 'reset' || this.auth.recoveryMode()) this.mode.set('reset');
  }

  async submit(): Promise<void> {
    this.message.set('');
    const { firstName, lastName, email, password, confirmPassword } = this.form.getRawValue();
    const mode = this.mode();
    if (mode !== 'reset') {
      this.form.controls.email.markAsTouched();
      if (this.form.controls.email.invalid) return this.showMessage('Enter a valid email address.', 'error');
    }
    if (mode === 'forgot') return this.resetRequest(email);
    if (!password || password.length < 6) return this.showMessage('Use a password with at least six characters.', 'error');
    if (mode === 'reset') return this.saveNewPassword(password, confirmPassword);
    if (mode === 'signup' && (!firstName.trim() || !lastName.trim())) return this.showMessage('Enter your first and last name.', 'error');

    this.loading.set(true);
    try {
      if (mode === 'signup') {
        const signedIn = await this.auth.signUp(email, password, firstName, lastName);
        if (!signedIn) {
          this.showMessage('Account created. Check your inbox for a confirmation link, then sign in.', 'success');
          this.mode.set('signin');
          return;
        }
      } else {
        await this.auth.signIn(email, password);
      }
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      this.showMessage(this.errorText(error), 'error');
    } finally {
      this.loading.set(false);
    }
  }

  private async resetRequest(email: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.auth.sendPasswordReset(email);
      this.showMessage('Password reset link sent if this email has a Pathwise account. Check your inbox.', 'success');
    } catch (error) {
      this.showMessage(this.errorText(error), 'error');
    } finally { this.loading.set(false); }
  }

  private async saveNewPassword(password: string, confirmPassword: string): Promise<void> {
    if (password !== confirmPassword) return this.showMessage('Those passwords do not match.', 'error');
    this.loading.set(true);
    try {
      await this.auth.updatePassword(password);
      this.showMessage('Password updated. You are signed in.', 'success');
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      this.showMessage(this.errorText(error), 'error');
    } finally { this.loading.set(false); }
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message.set(message);
    this.messageType.set(type);
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Pathwise could not complete that request. Please try again.';
  }
}
