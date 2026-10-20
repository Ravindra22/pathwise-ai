import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private client: SupabaseClient | null = null;
  private initialization: Promise<void> | null = null;

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly recoveryMode = signal(false);
  readonly configError = signal('');

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = this.initializeClient();
    return this.initialization;
  }

  async whenReady(): Promise<void> {
    await this.initialize();
  }

  getClient(): SupabaseClient {
    if (!this.client) throw new Error(this.configError() || 'Supabase Auth is not configured for this app.');
    return this.client;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user.set(data.user);
  }

  async signUp(email: string, password: string, firstName: string, lastName: string): Promise<boolean> {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { data, error } = await this.getClient().auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName } }
    });
    if (error) throw error;
    this.user.set(data.session?.user ?? null);
    return Boolean(data.session);
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.getClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { data, error } = await this.getClient().auth.updateUser({ password });
    if (error) throw error;
    this.user.set(data.user);
    this.recoveryMode.set(false);
  }

  async signOut(): Promise<void> {
    const { error } = await this.getClient().auth.signOut();
    if (error) throw error;
    this.user.set(null);
    this.recoveryMode.set(false);
    await this.router.navigateByUrl('/analyze');
  }

  private async initializeClient(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<SupabaseConfig>('/api/config'));
      if (!config.supabaseUrl || !config.supabaseKey) {
        this.configError.set('Supabase is not configured. Add its URL and publishable key to the server environment.');
        return;
      }
      this.client = createClient(config.supabaseUrl, config.supabaseKey);
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      this.user.set(data.session?.user ?? null);
      this.client.auth.onAuthStateChange((event: string, session: Session | null) => {
        this.user.set(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          this.recoveryMode.set(true);
          queueMicrotask(() => void this.router.navigateByUrl('/login'));
        }
        if (event === 'SIGNED_OUT') this.recoveryMode.set(false);
      });
    } catch {
      this.configError.set('Pathwise could not connect to Supabase. Check the server configuration and try again.');
    } finally {
      this.ready.set(true);
    }
  }
}
