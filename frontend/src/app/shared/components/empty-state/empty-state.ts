import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state fade-in">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-desc">{{ description }}</p>
      @if (actionLabel) {
        <button class="btn btn-primary" (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: `
    .empty-state { text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-icon { color: var(--text-muted); margin-bottom: 20px; opacity: 0.5; }
    .empty-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
    .empty-desc { color: var(--text-muted); font-size: 0.9375rem; max-width: 320px; margin-bottom: 24px; line-height: 1.5; }
  `
})
export class EmptyStateComponent {
  @Input() title = 'Veri Bulunamadı';
  @Input() description = 'Şu an gösterilecek bir kayıt bulunmuyor.';
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
