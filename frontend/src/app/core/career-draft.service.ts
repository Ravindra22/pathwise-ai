import { Injectable, signal } from '@angular/core';
import { AnalyzeRequest } from '../models/career-analysis';

@Injectable({ providedIn: 'root' })
export class CareerDraftService {
  readonly draft = signal<AnalyzeRequest>({ resume: '', job: '' });

  update(draft: AnalyzeRequest): void {
    this.draft.set(draft);
  }
}
