import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, BlockedIP } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-blocked-ips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="blocked-ips fade-in">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ summary().active }}</span>
            <span class="stat-label">IPs Bloquées (Actives)</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon shield">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ summary().firewall_blocked }}</span>
            <span class="stat-label">Bloquées Pare-feu Windows</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ summary().auto_blocked }}</span>
            <span class="stat-label">Auto-bloquées</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ summary().unblocked }}</span>
            <span class="stat-label">Débloquées</span>
          </div>
        </div>
      </div>

      <!-- Manual Block Form -->
      <div class="card block-form">
        <h3>Bloquer une IP manuellement</h3>
        <div class="form-row">
          <input
            class="input"
            [(ngModel)]="newIP"
            placeholder="192.168.1.100"
            (keydown.enter)="manualBlock()"
          />
          <input
            class="input reason-input"
            [(ngModel)]="newReason"
            placeholder="Raison du blocage (optionnel)"
          />
          <button class="btn btn-danger" (click)="manualBlock()" [disabled]="!newIP">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Bloquer
          </button>
        </div>
      </div>

      <!-- Blocked IPs Table -->
      <div class="card table-section">
        <div class="table-header">
          <h3>Liste des IPs Bloquées</h3>
          <div class="filter-group">
            <select class="input select filter-select" [(ngModel)]="statusFilter" (change)="loadBlockedIPs()">
              <option value="">Toutes</option>
              <option value="active">Actives</option>
              <option value="unblocked">Débloquées</option>
            </select>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Raison</th>
                <th>Confiance</th>
                <th>Attaques</th>
                <th>Bloquée le</th>
                <th>Type</th>
                <th>Pare-feu</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (ip of blockedIPs(); track ip.id) {
                <tr [class.row-active]="ip.status === 'active'" [class.row-unblocked]="ip.status === 'unblocked'">
                  <td>
                    <code class="ip-code" [class.ip-blocked]="ip.status === 'active'">{{ ip.ip_address }}</code>
                  </td>
                  <td class="reason-cell">{{ ip.reason }}</td>
                  <td>
                    @if (ip.confidence !== null) {
                      <span class="confidence-text" [class.high]="ip.confidence >= 90">{{ ip.confidence }}%</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>
                    <span class="attack-count" [class.high-count]="ip.attack_count >= 10">
                      {{ ip.attack_count }}
                    </span>
                  </td>
                  <td>{{ formatDate(ip.blocked_at) }}</td>
                  <td>
                    <span class="badge" [class.badge-orange]="ip.auto_blocked" [class.badge-info]="!ip.auto_blocked">
                      {{ ip.auto_blocked ? 'Auto' : 'Manuel' }}
                    </span>
                  </td>
                  <td>
                    @if (ip.firewall_blocked) {
                      <span class="badge badge-firewall">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <path d="M9 12l2 2 4-4"/>
                        </svg>
                        Actif
                      </span>
                    } @else if (ip.status === 'active') {
                      <span class="badge badge-warning">BD seule</span>
                    } @else {
                      <span class="badge badge-neutral">—</span>
                    }
                  </td>
                  <td>
                    @if (ip.status === 'active') {
                      <span class="badge badge-danger status-active">
                        <span class="pulse-dot"></span>
                        Bloquée
                      </span>
                    } @else {
                      <span class="badge badge-success">Débloquée</span>
                    }
                  </td>
                  <td>
                    @if (ip.status === 'active') {
                      <button class="btn btn-sm btn-secondary" (click)="unblock(ip.id)">
                        Débloquer
                      </button>
                    }
                  </td>
                </tr>
              }
              @if (blockedIPs().length === 0) {
                <tr>
                  <td colspan="9" class="empty-state">Aucune IP bloquée trouvée</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
    }

    .stat-icon.red {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--color-attack);
    }
    .stat-icon.shield {
      background-color: rgba(239, 68, 68, 0.2);
      color: var(--color-attack);
    }
    .stat-icon.orange {
      background-color: rgba(249, 115, 22, 0.15);
      color: var(--color-orange);
    }
    .stat-icon.green {
      background-color: rgba(34, 197, 94, 0.15);
      color: var(--color-benign);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .block-form {
      margin-bottom: 1.5rem;
    }
    .block-form h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .form-row .input {
      max-width: 220px;
    }
    .reason-input {
      max-width: 300px !important;
      flex: 1;
    }

    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .table-section { padding: 0; overflow: hidden; }
    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    .table-header h3 { font-size: 1rem; font-weight: 600; }
    .filter-select { max-width: 160px; }

    .ip-code {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.8125rem;
      padding: 0.125rem 0.375rem;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-sm);
    }
    .ip-code.ip-blocked {
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .reason-cell {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .confidence-text { font-weight: 600; }
    .confidence-text.high { color: var(--color-attack); }

    .attack-count {
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--bg-tertiary);
    }
    .attack-count.high-count {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-attack);
    }

    .badge-firewall {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.2));
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
      font-weight: 600;
    }

    .badge-neutral {
      background: transparent;
      color: var(--text-muted);
    }

    .status-active {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #ef4444;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
    }

    .row-active {
      border-left: 3px solid var(--color-attack);
    }
    .row-unblocked {
      opacity: 0.6;
    }

    .empty-state {
      text-align: center;
      padding: 3rem !important;
      color: var(--text-muted);
    }

    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: 1fr; }
      .form-row { flex-direction: column; }
      .form-row .input { max-width: 100%; }
    }
  `]
})
export class BlockedIPsComponent implements OnInit {
  blockedIPs = signal<BlockedIP[]>([]);
  summary = signal<any>({ active: 0, unblocked: 0, auto_blocked: 0, firewall_blocked: 0 });
  newIP = '';
  newReason = '';
  statusFilter = '';

  constructor(
    private dataService: DataService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadBlockedIPs();
  }

  loadBlockedIPs() {
    const params: any = { per_page: 200 };
    if (this.statusFilter) params.status = this.statusFilter;

    this.dataService.getBlockedIPs(params).subscribe({
      next: (res) => {
        this.blockedIPs.set(res.blocked_ips);
        this.summary.set(res.summary);
      },
      error: (err) => console.error('Blocked IPs error', err)
    });
  }

  manualBlock() {
    if (!this.newIP.trim()) return;
    this.dataService.blockIP(this.newIP.trim(), this.newReason.trim() || undefined).subscribe({
      next: (res) => {
        this.notificationService.show(
          `IP ${this.newIP} bloquée avec succès`,
          res.blocked_ip?.firewall_blocked ? 'firewall' : 'success',
          this.newIP
        );
        this.newIP = '';
        this.newReason = '';
        this.loadBlockedIPs();
      },
      error: (err) => {
        this.notificationService.show(
          err.error?.error || 'Erreur lors du blocage',
          'error'
        );
      }
    });
  }

  unblock(id: number) {
    this.dataService.unblockIP(id).subscribe({
      next: (res) => {
        this.notificationService.show(
          `IP ${res.blocked_ip?.ip_address} débloquée`,
          'success'
        );
        this.loadBlockedIPs();
      },
      error: (err) => {
        this.notificationService.show(
          err.error?.error || 'Erreur lors du déblocage',
          'error'
        );
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
