import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="notificationService.dismiss(toast.id)">
          <div class="toast-icon">
            @if (toast.type === 'firewall') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            } @else if (toast.type === 'error') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            } @else if (toast.type === 'warning') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            } @else {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            }
          </div>
          <div class="toast-content">
            <span class="toast-message">{{ toast.message }}</span>
            @if (toast.ip) {
              <code class="toast-ip">{{ toast.ip }}</code>
            }
          </div>
          <button class="toast-close" (click)="notificationService.dismiss(toast.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 420px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      backdrop-filter: blur(12px);
      border: 1px solid;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast-firewall {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95));
      border-color: rgba(239, 68, 68, 0.6);
      color: #fff;
    }

    .toast-error {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(185, 28, 28, 0.9));
      border-color: rgba(239, 68, 68, 0.5);
      color: #fff;
    }

    .toast-warning {
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(202, 138, 4, 0.9));
      border-color: rgba(234, 179, 8, 0.5);
      color: #fff;
    }

    .toast-success {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9));
      border-color: rgba(34, 197, 94, 0.5);
      color: #fff;
    }

    .toast-info {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9));
      border-color: rgba(59, 130, 246, 0.5);
      color: #fff;
    }

    .toast-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .toast-message {
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.4;
    }

    .toast-ip {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.75rem;
      padding: 0.125rem 0.375rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      width: fit-content;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
  `]
})
export class ToastContainerComponent {
  constructor(public notificationService: NotificationService) {}
}
