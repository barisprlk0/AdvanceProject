import { Component } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="toast.type" (click)="toastService.remove(toast.id)">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('success') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              }
              @case ('error') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              }
              @default {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              }
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      background: white;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      max-width: 400px;
      cursor: pointer;
      animation: slideIn 0.3s ease forwards;
      border-left: 4px solid var(--primary);
    }
    .toast.success { border-left-color: #10b981; }
    .toast.error { border-left-color: #ef4444; }
    .toast.warning { border-left-color: #f59e0b; }
    .toast-icon { display: flex; align-items: center; justify-content: center; }
    .toast.success .toast-icon { color: #10b981; }
    .toast.error .toast-icon { color: #ef4444; }
    .toast-message { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
