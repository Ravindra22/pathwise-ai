import { Component, EventEmitter, forwardRef, inject, Output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ResumeFileService } from '../../core/resume-file.service';

@Component({
  selector: 'pw-resume-upload',
  standalone: true,
  template: `
    <div class="upload-row">
      <label class="upload-button" for="{{ inputId }}"><span aria-hidden="true">↑</span> Choose resume file</label>
      <input [id]="inputId" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" (change)="onFile($event)" [disabled]="loading() || disabledState()" />
      <span class="upload-help">PDF, Word, TXT, or MD · up to 5 MB</span>
    </div>
    @if (status()) { <p class="upload-status" [class.error]="hasError()" role="status">{{ status() }}</p> }
  `,
  styles: [`
    :host { display:block; margin: 0 0 10px; }
    .upload-row { display:flex; align-items:center; flex-wrap:wrap; gap:9px; }
    .upload-button { display:inline-flex; align-items:center; gap:7px; padding:9px 11px; border:1px solid rgba(197,255,132,.31); border-radius:6px; color:#c5ff84; background:rgba(197,255,132,.07); font:600 12px 'DM Sans',sans-serif; cursor:pointer; }
    .upload-button:hover { background:rgba(197,255,132,.13); }
    .upload-button span { font-size:14px; }
    input { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; clip-path:inset(50%); }
    input:focus-visible + .upload-help { outline:2px solid #c5ff84; outline-offset:3px; }
    .upload-help,.upload-status { color:#a3b0c4; font:12px/1.5 'DM Sans',sans-serif; }
    .upload-status { margin:7px 0 0; }
    .upload-status.error { color:#ffb49c; }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ResumeUploadComponent), multi: true }]
})
export class ResumeUploadComponent implements ControlValueAccessor {
  private static nextId = 0;
  private readonly files = inject(ResumeFileService);
  readonly inputId = `resume-file-${ResumeUploadComponent.nextId++}`;
  readonly loading = signal(false);
  readonly disabledState = signal(false);
  readonly status = signal('');
  readonly hasError = signal(false);
  @Output() loaded = new EventEmitter<void>();
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private disabled = false;

  writeValue(_value: string): void {}
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; this.disabledState.set(isDisabled); }

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.disabled) return;
    this.loading.set(true);
    this.hasError.set(false);
    this.status.set(`Reading ${file.name}…`);
    try {
      const text = await this.files.extract(file);
      this.onChange(text);
      this.onTouched();
      this.loaded.emit();
      this.status.set(`Loaded ${file.name}. You can review or edit the extracted text below.`);
    } catch (error) {
      this.hasError.set(true);
      this.status.set(error instanceof Error ? error.message : 'Could not read the file. Paste the text instead.');
    } finally {
      this.loading.set(false);
      input.value = '';
    }
  }
}
