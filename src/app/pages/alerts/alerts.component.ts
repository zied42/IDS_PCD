import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="alerts-page fade-in">
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-value">{{ openAlerts() }}</span>
            <span class="summary-label">Total Open</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-value">{{ highSeverityCount() }}</span>
            <span class="summary-label">High Severity</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-value">{{ resolvedToday() }}</span>
            <span class="summary-label">Resolved Today</span>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card filter-bar">
        <div class="filter-group">
          <label>Severity</label>
          <select class="input select" [(ngModel)]="severityFilter" (change)="applyFilters()">
            <option value="all">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select class="input select" [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Date Range</label>
          <div class="date-inputs">
            <input type="date" class="input" [(ngModel)]="startDate" (change)="applyFilters()"/>
            <span class="date-separator">to</span>
            <input type="date" class="input" [(ngModel)]="endDate" (change)="applyFilters()"/>
          </div>
        </div>
        <button class="btn btn-secondary" (click)="clearFilters()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
          Clear
        </button>
      </div>

      <!-- Alerts Table -->
      <div class="card table-section">
        <div class="table-header">
          <h3>Security Alerts</h3>
          <span class="alert-count">{{ totalAlerts() }} alerts</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Src IP</th>
                <th>Dst IP</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (alert of paginatedAlerts(); track alert.id) {
                <tr>
                  <td class="text-muted">#{{ alert.id }}</td>
                  <td>{{ formatDate(alert.timestamp) }}</td>
                  <td><code class="ip-code">{{ alert.src_ip }}</code></td>
                  <td><code class="ip-code">{{ alert.dst_ip }}</code></td>
                  <td>
                    <span class="confidence-text"
                      [class.high]="alert.confidence >= 90"
                      [class.medium]="alert.confidence >= 70 && alert.confidence < 90"
                      [class.low]="alert.confidence < 70">
                      {{ alert.confidence }}%
                    </span>
                  </td>
                  <td>
                    <span class="badge"
                      [class.badge-danger]="alert.severity === 'High'"
                      [class.badge-orange]="alert.severity === 'Medium'"
                      [class.badge-warning]="alert.severity === 'Low'">
                      {{ alert.severity }}
                    </span>
                  </td>
                  <td>
                    <span class="badge"
                      [class.badge-warning]="alert.status === 'open'"
                      [class.badge-info]="alert.status === 'reviewed'"
                      [class.badge-success]="alert.status === 'resolved'">
                      {{ alert.status | titlecase }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      @if (alert.status === 'open') {
                        <button class="btn btn-sm btn-secondary" (click)="markReviewed(alert.id)">Mark Reviewed</button>
                      }
                      @if (alert.status !== 'resolved') {
                        <button class="btn btn-sm btn-primary" (click)="resolve(alert.id)">Resolve</button>
                      }
                      @if (alert.status === 'resolved') {
                        <span class="resolved-text">Resolved</span>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p>No alerts match your filters</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (totalAlerts() > pageSize) {
          <div class="pagination-container">
            <div class="pagination-info">
              Showing {{ (currentPage() - 1) * pageSize + 1 }} to {{ Math.min(currentPage() * pageSize, totalAlerts()) }} of {{ totalAlerts() }}
            </div>
            <div class="pagination">
              <button class="pagination-btn" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              @for (page of visiblePages(); track page) {
                <button class="pagination-btn" [class.active]="page === currentPage()" (click)="goToPage(page)">{{ page }}</button>
              }
              <button class="pagination-btn" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); }
    .summary-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: var(--radius-md); }
    .summary-icon.orange { background-color: rgba(249, 115, 22, 0.15); color: var(--color-orange); }
    .summary-icon.red { background-color: rgba(239, 68, 68, 0.15); color: var(--color-attack); }
    .summary-icon.green { background-color: rgba(34, 197, 94, 0.15); color: var(--color-benign); }
    .summary-content { display: flex; flex-direction: column; }
    .summary-value { font-size: 1.5rem; font-weight: 700; }
    .summary-label { font-size: 0.75rem; color: var(--text-secondary); }
    .filter-bar { display: flex; align-items: flex-end; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .filter-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .filter-group label { font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); }
    .filter-group .input { min-width: 150px; }
    .date-inputs { display: flex; align-items: center; gap: 0.5rem; }
    .date-separator { color: var(--text-muted); font-size: 0.875rem; }
    .date-inputs .input { min-width: 130px; }
    .table-section { padding: 0; overflow: hidden; }
    .table-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); }
    .table-header h3 { font-size: 1rem; font-weight: 600; }
    .alert-count { font-size: 0.875rem; color: var(--text-secondary); }
    .ip-code { font-family: 'SF Mono', Monaco, monospace; font-size: 0.8125rem; padding: 0.125rem 0.375rem; background-color: var(--bg-tertiary); border-radius: var(--radius-sm); }
    .confidence-text { font-weight: 500; }
    .confidence-text.high { color: var(--color-benign); }
    .confidence-text.medium { color: var(--color-orange); }
    .confidence-text.low { color: var(--color-attack); }
    .action-buttons { display: flex; gap: 0.5rem; }
    .resolved-text { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
    .empty-state { text-align: center; padding: 3rem !important; color: var(--text-muted); }
    .empty-state svg { margin-bottom: 1rem; opacity: 0.5; }
    .pagination-container { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); }
    .pagination-info { font-size: 0.875rem; color: var(--text-secondary); }
    @media (max-width: 1024px) { .summary-grid { grid-template-columns: 1fr; } .filter-bar { flex-direction: column; align-items: stretch; } }
  `]
})
export class AlertsComponent implements OnInit {
  Math = Math;
  pageSize = 20;
  currentPage = signal(1);

  severityFilter = 'all';
  statusFilter = 'all';
  startDate = '';
  endDate = '';

  summary = signal<any>({ total_open: 0, high: 0, medium: 0, low: 0, resolved_today: 0 });
  filteredAlerts = signal<any[]>([]);
  totalAlerts = signal(0);

  openAlerts = computed(() => this.summary().total_open);
  highSeverityCount = computed(() => this.summary().high);
  resolvedToday = computed(() => this.summary().resolved_today);

  totalPages = computed(() => Math.ceil(this.totalAlerts() / this.pageSize));
  paginatedAlerts = computed(() => this.filteredAlerts());

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadAlerts();
  }

  private loadSummary(): void {
    this.dataService.getAlertsSummary().subscribe({
      next: (res: any) => this.summary.set(res),
      error: (err: any) => console.error('Summary error', err)
    });
  }

  loadAlerts(): void {
    const params: any = { page: this.currentPage(), per_page: this.pageSize };
    if (this.severityFilter !== 'all') params['severity'] = this.severityFilter;
    if (this.statusFilter !== 'all')   params['status']   = this.statusFilter;
    if (this.startDate)                params['from']      = this.startDate;
    if (this.endDate)                  params['to']        = this.endDate;

    this.dataService.getAlerts(params).subscribe({
      next: (res: any) => {
        this.filteredAlerts.set(res.alerts);
        this.totalAlerts.set(res.total);
      },
      error: (err: any) => console.error('Alerts error', err)
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadAlerts();
    this.loadSummary();
  }

  clearFilters(): void {
    this.severityFilter = 'all';
    this.statusFilter = 'all';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  markReviewed(id: number): void {
    this.dataService.updateAlertStatus(id, 'reviewed').subscribe({
      next: () => this.applyFilters(),
      error: (err: any) => console.error('Update error', err)
    });
  }

  resolve(id: number): void {
    this.dataService.updateAlertStatus(id, 'resolved').subscribe({
      next: () => this.applyFilters(),
      error: (err: any) => console.error('Update error', err)
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadAlerts();
    }
  }
}