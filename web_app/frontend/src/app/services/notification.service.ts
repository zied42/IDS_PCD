import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'firewall';
  ip?: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 0;
  toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', ip?: string) {
    const toast: Toast = {
      id: ++this.counter,
      message,
      type,
      ip,
      timestamp: new Date()
    };
    this.toasts.update(t => [toast, ...t].slice(0, 5));

    // Auto-dismiss after 6 seconds
    setTimeout(() => this.dismiss(toast.id), 6000);
  }

  dismiss(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  firewallBlocked(ip: string) {
    this.show(
      `🛡️ IP ${ip} bloquée dans le pare-feu Windows`,
      'firewall',
      ip
    );
  }
}
