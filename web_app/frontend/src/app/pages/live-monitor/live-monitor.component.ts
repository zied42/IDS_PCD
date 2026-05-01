import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, FlowRecord } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-live-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="live-monitor fade-in">
      <!-- Stats Header -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats().today.total| number }}</span>
            <span class="stat-label">Total Flows Today</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats().today.attacks | number }}</span>
            <span class="stat-label">Attack Count</span>
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
            <span class="stat-value">{{ stats().today.benign | number }}</span>
            <span class="stat-label">Benign Count</span>
          </div>
        </div>
        
        <div class="stat-card firewall-card">
          <div class="stat-icon shield">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ blockedCount() }}</span>
            <span class="stat-label">IPs Bloquées (Firewall)</span>
          </div>
        </div>
      </div>
      
      <!-- Table Section -->
      <div class="card table-section">
        <div class="table-header">
          <div class="table-title">
            <h3>Network Flow Monitor</h3>
            <span class="refresh-indicator" [class.active]="isRefreshing()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Auto-refresh every {{ currentRefreshSec }}s
            </span>
          </div>
          <div class="table-actions">
            <span class="row-count">{{ paginatedFlows().length }} of {{ totalFlows() }} flows</span>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Src IP</th>
                <th>Dst IP</th>
                <th>Protocol</th>
                <th>Prediction</th>
                <th>Confidence</th>
                <th>Firewall</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (flow of paginatedFlows(); track flow.id) {
                <tr [class.row-needs-review]="flow.needs_review" 
                    [class.row-blocked]="isIPBlocked(flow.src_ip) && flow.prediction === 'Attack'">
                  <td class="text-muted">#{{ flow.id }}</td>
                  <td>{{ formatDate(flow.timestamp) }}</td>
                  <td>
                    <div class="ip-cell">
                      <code class="ip-code" [class.ip-blocked]="isIPBlocked(flow.src_ip)">{{ flow.src_ip }}</code>
                      @if (isIPBlocked(flow.src_ip)) {
                        <span class="blocked-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                          BLOQUÉE
                        </span>
                      }
                    </div>
                  </td>
                  <td><code class="ip-code">{{ flow.dst_ip}}</code></td>
                  <td><span class="protocol-badge">{{ getProtocolName(flow.protocol) }}</span></td>
                  <td>
                    <span class="badge" [class.badge-success]="flow.prediction === 'Benign'" [class.badge-danger]="flow.prediction === 'Attack'">
                      {{ flow.prediction }}
                    </span>
                  </td>
                  <td>
                    <div class="confidence-cell">
                      <div class="confidence-bar">
                        <div 
                          class="confidence-fill" 
                          [style.width.%]="flow.confidence"
                          [class.high]="flow.confidence >= 90"
                          [class.medium]="flow.confidence >= 70 && flow.confidence < 90"
                          [class.low]="flow.confidence < 70"
                        ></div>
                      </div>
                      <span 
                        class="confidence-value"
                        [class.high]="flow.confidence >= 90"
                        [class.medium]="flow.confidence >= 70 && flow.confidence < 90"
                        [class.low]="flow.confidence < 70"
                      >{{ flow.confidence }}%</span>
                    </div>
                  </td>
                  <td>
                    @if (isIPBlocked(flow.src_ip) && flow.prediction === 'Attack') {
                      <span class="badge badge-firewall">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <path d="M9 12l2 2 4-4"/>
                        </svg>
                        Système Bloqué
                      </span>
                    } @else if (flow.prediction === 'Attack') {
                      <div style="display:flex;gap:8px;align-items:center;">
                        <span class="badge badge-danger-outline">Non bloquée</span>
                        <button class="btn-block-sm" (click)="blockIpManually(flow.src_ip)" title="Block IP">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                          Block
                        </button>
                      </div>
                    } @else {
                      <span class="badge badge-neutral">—</span>
                    }
                  </td>
                  <td>
                      <span class="badge" 
                        [class.badge-info]="!flow.needs_review" 
                        [class.badge-warning]="flow.needs_review">
                        {{ flow.needs_review ? 'Needs Review' : 'Processed' }}
                      </span>

                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="pagination-container">
          <div class="pagination-info">
            Showing {{ (currentPage() - 1) * pageSize + 1 }} to {{ Math.min(currentPage() * pageSize, totalFlows()) }} of {{ totalFlows()}}
          </div>
          <div class="pagination">
            <button 
              class="pagination-btn" 
              (click)="goToPage(currentPage() - 1)"
              [disabled]="currentPage() === 1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            
            @for (page of visiblePages(); track page) {
              <button 
                class="pagination-btn" 
                [class.active]="page === currentPage()"
                (click)="goToPage(page)"
              >
                {{ page }}
              </button>
            }
            
            <button 
              class="pagination-btn" 
              (click)="goToPage(currentPage() + 1)"
              [disabled]="currentPage() === totalPages()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
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

    .firewall-card {
      border-color: rgba(239, 68, 68, 0.3);
      background: linear-gradient(135deg, var(--bg-secondary), rgba(239, 68, 68, 0.05));
    }
    
    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
    }
    
    .stat-icon.blue {
      background-color: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
    }
    
    .stat-icon.red {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--color-attack);
    }
    
    .stat-icon.green {
      background-color: rgba(34, 197, 94, 0.15);
      color: var(--color-benign);
    }
    
    .stat-icon.orange {
      background-color: rgba(249, 115, 22, 0.15);
      color: var(--color-orange);
    }

    .stat-icon.shield {
      background-color: rgba(239, 68, 68, 0.2);
      color: var(--color-attack);
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
    
    .table-section {
      padding: 0;
      overflow: hidden;
    }
    
    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .table-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .table-title h3 {
      font-size: 1rem;
      font-weight: 600;
    }
    
    .refresh-indicator {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .refresh-indicator.active svg {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .row-count {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .ip-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .ip-code {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.8125rem;
      padding: 0.125rem 0.375rem;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .ip-code.ip-blocked {
      background-color: rgba(239, 68, 68, 0.2);
      color: var(--color-attack);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .blocked-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.25));
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 4px;
      animation: pulseGlow 2s infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 4px rgba(239, 68, 68, 0.3); }
      50% { box-shadow: 0 0 12px rgba(239, 68, 68, 0.6); }
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

    .badge-danger-outline {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border-color);
    }

    .badge-neutral {
      background: transparent;
      color: var(--text-muted);
    }

    .row-blocked {
      border-left: 3px solid var(--color-attack) !important;
      background-color: rgba(239, 68, 68, 0.05) !important;
    }

    .row-blocked:hover {
      background-color: rgba(239, 68, 68, 0.1) !important;
    }
    
    .protocol-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-sm);
    }
    
    .confidence-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .confidence-bar {
      width: 60px;
      height: 6px;
      background-color: var(--bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
    }
    
    .confidence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    
    .confidence-fill.high { background-color: var(--color-benign); }
    .confidence-fill.medium { background-color: var(--color-orange); }
    .confidence-fill.low { background-color: var(--color-attack); }
    
    .confidence-value {
      font-size: 0.8125rem;
      font-weight: 500;
      min-width: 45px;
    }
    
    .confidence-value.high { color: var(--color-benign); }
    .confidence-value.medium { color: var(--color-orange); }
    .confidence-value.low { color: var(--color-attack); }
    
    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
    }
    
    .pagination-info {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .pagination-container {
        flex-direction: column;
        gap: 1rem;
      }
    }

    .btn-block-sm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #ef4444;
      background: transparent;
      border: 1px solid #ef4444;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-block-sm:hover {
      background: #ef4444;
      color: white;
    }
  `]
})
export class LiveMonitorComponent implements OnInit, OnDestroy {
  Math = Math;
  pageSize = 50;
  currentPage = signal(1);
  isRefreshing = signal(false);
  currentRefreshSec = 3;
  private previousAttackCount = -1;
  private audioCtx: AudioContext | null = null;

  // Stats
  stats = signal<any>({
    today: { total: 0, attacks: 0, benign: 0, attack_rate: 0 },
    open_alerts: 0
  });

  // Flows
  flows = signal<any[]>([]);
  totalFlows = signal(0);

  // Blocked IPs tracking
  blockedIPs = signal<Set<string>>(new Set());
  blockedCount = signal(0);
  private knownBlockedIPs = new Set<string>();

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  totalPages = computed(() => Math.ceil(this.totalFlows() / this.pageSize));

  paginatedFlows = computed(() => this.flows());

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

  constructor(
    private dataService: DataService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadFlows();
    this.loadBlockedIPs();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private loadStats(): void {
    this.dataService.getLiveStats().subscribe({
      next: (res) => {
        const newAttacks = res?.today?.attacks ?? 0;
        if (this.previousAttackCount >= 0 && newAttacks > this.previousAttackCount) {
          this.playAlertSound();
        }
        this.previousAttackCount = newAttacks;
        this.stats.set(res);
      },
      error: (err) => console.error('Stats error', err)
    });
  }

  private loadFlows(page = 1): void {
    this.isRefreshing.set(true);
    this.dataService.getPredictions(page, this.pageSize).subscribe({
      next: (res) => {
        this.flows.set(res.predictions);
        this.totalFlows.set(res.total);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        console.error('Flows error', err);
        this.isRefreshing.set(false);
      }
    });
  }

  private loadBlockedIPs(): void {
    this.dataService.getBlockedIPs({ status: 'active', per_page: 500 }).subscribe({
      next: (res) => {
        const ips = new Set<string>(res.blocked_ips.map((b: any) => b.ip_address));
        
        // Detect newly blocked IPs and show toast notification
        ips.forEach(ip => {
          if (!this.knownBlockedIPs.has(ip)) {
            // Check if this IP has firewall_blocked = true
            const blockedEntry = res.blocked_ips.find((b: any) => b.ip_address === ip);
            if (blockedEntry?.firewall_blocked) {
              this.notificationService.firewallBlocked(ip);
            }
          }
        });
        
        this.knownBlockedIPs = new Set(ips);
        this.blockedIPs.set(ips);
        this.blockedCount.set(res.summary?.firewall_blocked || res.summary?.active || ips.size);
      },
      error: (err) => console.error('Blocked IPs error', err)
    });
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs().has(ip);
  }

  private startAutoRefresh(): void {
    const stored = localStorage.getItem('refreshInterval');
    this.currentRefreshSec = stored ? parseInt(stored, 10) : 3;
    const ms = this.currentRefreshSec * 1000;
    this.refreshInterval = setInterval(() => {
      this.loadStats();
      this.loadFlows(this.currentPage());
      this.loadBlockedIPs();
    }, ms);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  getProtocolName(protocol: number): string {
    const protocols: Record<number, string> = {
      6: 'TCP',
      17: 'UDP',
      1: 'ICMP',
      0: 'HOPOPT'
    };
    return protocols[protocol] || `${protocol}`;
  }
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadFlows(page);
    }
  }

  blockIpManually(ip: string): void {
    this.dataService.blockIP(ip, 'Manual block from Live Monitor').subscribe({
      next: () => {
        this.notificationService.show(`IP ${ip} manually blocked`, 'success');
        this.loadBlockedIPs();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to block IP';
        this.notificationService.show(msg, 'error');
      }
    });
  }

  private playAlertSound(): void {
    const soundEnabled = localStorage.getItem('soundAlerts') !== 'false';
    if (!soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio not supported or blocked by browser policy
    }
  }
}
