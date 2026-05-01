import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page fade-in">
      <!-- Profile Section -->
      <div class="card settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h3>Profile Settings</h3>
            <p>Manage your account information</p>
          </div>
        </div>
        <div class="settings-content">
          <div class="form-row">
            <div class="form-group">
              <label>Username</label>
              <input type="text" class="input" [value]="authService.user()?.username" readonly />
            </div>
            <div class="form-group">
              <label>Role</label>
              <input type="text" class="input" [value]="authService.user()?.role" readonly />
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications Section (all users) -->
      <div class="card settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div>
            <h3>Notification Settings</h3>
            <p>Configure how you receive alerts</p>
          </div>
        </div>
        <div class="settings-content">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Email Notifications</span>
              <span class="toggle-description">Receive email alerts for high severity attacks</span>
            </div>
            <button class="toggle-btn" [class.active]="emailNotifications()" (click)="emailNotifications.set(!emailNotifications())">
              <span class="toggle-slider"></span>
            </button>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Browser Notifications</span>
              <span class="toggle-description">Show desktop notifications for new alerts</span>
            </div>
            <button class="toggle-btn" [class.active]="browserNotifications()" (click)="browserNotifications.set(!browserNotifications())">
              <span class="toggle-slider"></span>
            </button>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Sound Alerts</span>
              <span class="toggle-description">Play sound when new attack is detected</span>
            </div>
            <button class="toggle-btn" [class.active]="soundAlerts()" (click)="toggleSound()">
              <span class="toggle-slider"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- ADMIN ONLY: Detection Settings + IPS Toggle    -->
      <!-- ============================================== -->
      @if (authService.isAdmin()) {
        <div class="card settings-section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h3>Detection Settings</h3>
              <p>Configure system mode, sensitivity and thresholds</p>
            </div>
          </div>
          <div class="settings-content">
            <!-- IPS/IDS Mode Toggle -->
            <div class="form-group">
              <label>System Mode</label>
              <select class="input select" [(ngModel)]="systemMode">
                <option value="ids">IDS — Intrusion Detection System (Monitor Only)</option>
                <option value="ips">IPS — Intrusion Prevention System (Auto Block)</option>
              </select>
              <span class="input-hint">
                @if (systemMode === 'ids') {
                  Detection only — attacks are logged but NOT blocked automatically
                } @else {
                  Auto-blocking enabled — attacks above threshold will be blocked in Windows Firewall
                }
              </span>
            </div>

            <div class="form-group">
              <label>Confidence Threshold (%)</label>
              <div class="slider-container">
                <input type="range" class="slider" min="50" max="99" [(ngModel)]="confidenceThreshold" />
                <span class="slider-value">{{ confidenceThreshold }}%</span>
              </div>
              <span class="input-hint">In IPS mode, only attacks above this threshold are auto-blocked</span>
            </div>

            <div class="form-group">
              <label>Auto-Refresh Interval</label>
              <select class="input select" [(ngModel)]="refreshInterval" (ngModelChange)="onRefreshIntervalChange()">
                <option value="1">1 second</option>
                <option value="3">3 seconds</option>
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
              </select>
              <span class="input-hint">How often to refresh the live monitor</span>
            </div>
          </div>
        </div>

        <!-- ADMIN ONLY: Add Threat -->
        <div class="card settings-section">
          <div class="section-header">
            <div class="section-icon" style="background-color:rgba(239,68,68,0.15);color:#ef4444;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h3>Add Threat</h3>
              <p>Manually flag a known malicious IP from external threat intelligence</p>
            </div>
          </div>
          <div class="settings-content">
            <div class="form-row">
              <div class="form-group">
                <label>Threat Source IP *</label>
                <input type="text" class="input" [(ngModel)]="newThreat.src_ip" placeholder="192.168.1.100" />
              </div>
              <div class="form-group">
                <label>Target IP</label>
                <input type="text" class="input" [(ngModel)]="newThreat.dst_ip" placeholder="10.0.0.1" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Classification *</label>
                <select class="input select" [(ngModel)]="newThreat.prediction">
                  <option value="Attack">Attack</option>
                  <option value="Benign">Benign</option>
                </select>
              </div>
              <div class="form-group">
                <label>Confidence (%) *</label>
                <input type="number" class="input" [(ngModel)]="newThreat.confidence" min="0" max="100" placeholder="95" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Protocol</label>
                <select class="input select" [(ngModel)]="newThreat.protocol">
                  <option value="6">TCP (6)</option>
                  <option value="17">UDP (17)</option>
                  <option value="1">ICMP (1)</option>
                  <option value="0">Other (0)</option>
                </select>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:0.5rem;">
              <button class="btn btn-primary" (click)="submitThreat()" [disabled]="isSubmitting()">
                @if (isSubmitting()) { Adding... } @else { Add Threat }
              </button>
            </div>
          </div>
        </div>

        <!-- ADMIN ONLY: User Management -->
        <div class="card settings-section">
          <div class="section-header">
            <div class="section-icon" style="background-color:rgba(16,185,129,0.15);color:#10b981;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h3>User Management</h3>
              <p>Add or remove analysts and administrators</p>
            </div>
          </div>
          <div class="settings-content">
            <!-- Add New User Form -->
            <div style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem;">
              <h4 style="margin-bottom:0.75rem;font-size:0.875rem;font-weight:600;">Create New User</h4>
              <div class="form-row">
                <div class="form-group">
                  <label>Full Name *</label>
                  <input type="text" class="input" [(ngModel)]="newUser.full_name" placeholder="John Doe" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" class="input" [(ngModel)]="newUser.email" placeholder="john&#64;company.com" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Username *</label>
                  <input type="text" class="input" [(ngModel)]="newUser.username" placeholder="john.doe" />
                </div>
                <div class="form-group">
                  <label>Password *</label>
                  <input type="text" class="input" [(ngModel)]="newUser.password" placeholder="Min 4 characters" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Role *</label>
                  <select class="input select" [(ngModel)]="newUser.role">
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:0.5rem;">
                <button class="btn btn-primary" (click)="createUser()" [disabled]="isCreatingUser()">
                  @if (isCreatingUser()) { Creating... } @else { Create User }
                </button>
              </div>
            </div>

            <!-- Existing Users List -->
            <h4 style="margin-bottom:0.5rem;font-size:0.875rem;font-weight:600;">Existing Users</h4>
            @for (user of users(); track user.id) {
              <div class="user-row">
                <div class="user-info">
                  <span class="user-name">{{ user.full_name || user.username }}</span>
                  <span class="user-meta">{{ user.username }} &middot; {{ user.email || 'No email' }}</span>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <span class="badge" [class.badge-admin]="user.role==='admin'" [class.badge-analyst]="user.role==='analyst'">{{ user.role }}</span>
                  <span class="user-login">{{ user.last_login ? 'Last: ' + formatDate(user.last_login) : 'Never logged in' }}</span>
                  @if (user.username !== authService.user()?.username) {
                    <button class="btn-delete-user" (click)="deleteUser(user)" title="Delete user">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            }
            @if (users().length === 0) {
              <p style="color:var(--text-muted);font-size:0.8125rem;">Loading users...</p>
            }
          </div>
        </div>

        <!-- ADMIN ONLY: Danger Zone -->
        <div class="card settings-section danger-zone">
          <div class="section-header">
            <div class="section-icon danger">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h3>Danger Zone</h3>
              <p>Irreversible actions</p>
            </div>
          </div>
          <div class="settings-content">
            <div class="danger-action">
              <div class="danger-info">
                <span class="danger-label">Clear All Alerts</span>
                <span class="danger-description">Remove all alerts from the system. This action cannot be undone.</span>
              </div>
              <button class="btn btn-danger" (click)="clearAlerts()">Clear Alerts</button>
            </div>
            <div class="danger-action">
              <div class="danger-info">
                <span class="danger-label">Reset Statistics</span>
                <span class="danger-description">Reset all statistics counters to zero.</span>
              </div>
              <button class="btn btn-danger" (click)="resetStatistics()">Reset Stats</button>
            </div>
          </div>
        </div>
      }

      <!-- Save Button -->
      <div class="save-section">
        <button class="btn btn-secondary" (click)="resetSettings()">Reset to Defaults</button>
        <button class="btn btn-primary" (click)="saveSettings()">
          Save Changes
        </button>
        @if (saveSuccess()) {
          <span style="color: var(--color-benign); font-size: 0.875rem;">&#10003; Saved successfully</span>
        }
        @if (saveError()) {
          <span style="color: var(--color-attack); font-size: 0.875rem;">&#10007; Save failed</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .settings-section { margin-bottom: 1.5rem; }
    .section-header {
      display: flex; align-items: flex-start; gap: 1rem;
      padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;
    }
    .section-icon {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px;
      background-color: rgba(59, 130, 246, 0.15); color: var(--accent-blue);
      border-radius: var(--radius-md); flex-shrink: 0;
    }
    .section-icon.danger { background-color: rgba(239, 68, 68, 0.15); color: var(--color-attack); }
    .section-header h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
    .section-header p  { font-size: 0.8125rem; color: var(--text-secondary); }
    .settings-content { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); }
    .input-hint { font-size: 0.75rem; color: var(--text-muted); }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);
    }
    .toggle-row:last-child { border-bottom: none; }
    .toggle-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .toggle-label { font-size: 0.875rem; font-weight: 500; }
    .toggle-description { font-size: 0.75rem; color: var(--text-muted); }
    .toggle-btn {
      position: relative; width: 48px; height: 26px;
      background-color: var(--bg-tertiary); border: none; border-radius: 13px;
      cursor: pointer; transition: background-color 0.2s ease;
    }
    .toggle-btn.active { background-color: var(--accent-blue); }
    .toggle-slider {
      position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
      background-color: white; border-radius: 50%; transition: transform 0.2s ease;
    }
    .toggle-btn.active .toggle-slider { transform: translateX(22px); }
    .slider-container { display: flex; align-items: center; gap: 1rem; }
    .slider {
      flex: 1; height: 6px; background-color: var(--bg-tertiary);
      border-radius: 3px; -webkit-appearance: none; appearance: none;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px;
      background-color: var(--accent-blue); border-radius: 50%;
      cursor: pointer; transition: transform 0.2s ease;
    }
    .slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
    .slider-value { min-width: 50px; font-size: 0.875rem; font-weight: 600; color: var(--accent-blue); }
    .danger-zone { border-color: rgba(239, 68, 68, 0.3); }
    .danger-action {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem; background-color: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.15); border-radius: var(--radius-md);
    }
    .danger-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .danger-label { font-size: 0.875rem; font-weight: 500; }
    .danger-description { font-size: 0.75rem; color: var(--text-muted); }
    .btn-danger {
      background-color: var(--color-attack); color: white;
      padding: 0.5rem 1rem; font-size: 0.8125rem;
      border: none; border-radius: var(--radius-md);
      cursor: pointer; transition: background-color 0.2s ease;
    }
    .btn-danger:hover { background-color: #dc2626; }
    .save-section {
      display: flex; justify-content: flex-end; gap: 1rem;
      padding-top: 1rem; align-items: center;
    }
    @media (max-width: 768px) {
      .form-row { grid-template-columns: 1fr; }
      .danger-action { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .save-section { flex-direction: column; }
      .save-section .btn { width: 100%; }
    }

    .user-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      margin-bottom: 0.5rem;
      transition: background-color 0.15s;
    }
    .user-row:hover { background-color: var(--bg-tertiary); }
    .user-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .user-name { font-size: 0.875rem; font-weight: 600; }
    .user-meta { font-size: 0.75rem; color: var(--text-muted); }
    .user-login { font-size: 0.7rem; color: var(--text-muted); }
    .badge-admin {
      background-color: rgba(239,68,68,0.15); color: #ef4444;
      padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;
    }
    .badge-analyst {
      background-color: rgba(59,130,246,0.15); color: var(--accent-blue);
      padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;
    }
    .btn-delete-user {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 6px;
      background: transparent; border: 1px solid rgba(239,68,68,0.3);
      color: #ef4444; cursor: pointer; transition: all 0.2s;
    }
    .btn-delete-user:hover { background: #ef4444; color: white; }
  `]
})
export class SettingsComponent implements OnInit {
  emailNotifications = signal(true);
  browserNotifications = signal(true);
  soundAlerts = signal(false);

  confidenceThreshold = 90;
  refreshInterval = '3';
  systemMode = 'ids';

  saveSuccess = signal(false);
  saveError = signal(false);
  isSubmitting = signal(false);
  isCreatingUser = signal(false);

  // Threat form
  newThreat = {
    src_ip: '', dst_ip: '', prediction: 'Attack',
    confidence: 95, protocol: '6'
  };

  // User management
  newUser = { full_name: '', email: '', username: '', password: '', role: 'analyst' };
  users = signal<any[]>([]);

  constructor(
    public authService: AuthService,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.refreshInterval = localStorage.getItem('refreshInterval') || '3';
    this.soundAlerts.set(localStorage.getItem('soundAlerts') !== 'false');
    this.dataService.getSettings().subscribe({
      next: (res: any) => {
        this.emailNotifications.set(res.notifications ?? true);
        this.confidenceThreshold = res.auto_block_threshold ?? 90;
        this.systemMode = res.system_mode || 'ids';
      },
      error: (err: any) => console.error('Settings error', err)
    });
    if (this.authService.isAdmin()) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.dataService.getUsers().subscribe({
      next: (list) => this.users.set(list),
      error: (err) => console.error('Users error', err)
    });
  }

  onRefreshIntervalChange(): void {
    localStorage.setItem('refreshInterval', this.refreshInterval);
  }

  toggleSound(): void {
    const val = !this.soundAlerts();
    this.soundAlerts.set(val);
    localStorage.setItem('soundAlerts', String(val));
  }

  saveSettings(): void {
    this.saveSuccess.set(false);
    this.saveError.set(false);
    const body: any = {
      theme: 'dark', language: 'en',
      notifications: this.emailNotifications()
    };
    if (this.authService.isAdmin()) {
      body.auto_block_threshold = this.confidenceThreshold;
      body.system_mode = this.systemMode;
    }
    localStorage.setItem('refreshInterval', this.refreshInterval);
    this.dataService.updateSettings(body).subscribe({
      next: () => {
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: () => {
        this.saveError.set(true);
        setTimeout(() => this.saveError.set(false), 3000);
      }
    });
  }

  submitThreat(): void {
    if (!this.newThreat.src_ip || !this.newThreat.confidence) {
      alert('Source IP and confidence are required');
      return;
    }
    this.isSubmitting.set(true);
    this.dataService.addThreat({
      ...this.newThreat,
      protocol: parseInt(this.newThreat.protocol)
    }).subscribe({
      next: () => {
        alert('Threat added successfully');
        this.newThreat = { src_ip: '', dst_ip: '', prediction: 'Attack', confidence: 95, protocol: '6' };
        this.isSubmitting.set(false);
      },
      error: (err) => {
        alert('Failed: ' + (err.error?.error || 'Server error'));
        this.isSubmitting.set(false);
      }
    });
  }

  createUser(): void {
    if (!this.newUser.username || !this.newUser.password) {
      alert('Username and password are required');
      return;
    }
    this.isCreatingUser.set(true);
    this.dataService.createUser(this.newUser).subscribe({
      next: (res) => {
        alert(`User "${res.user.username}" created successfully!\nRole: ${res.user.role}`);
        this.newUser = { full_name: '', email: '', username: '', password: '', role: 'analyst' };
        this.isCreatingUser.set(false);
        this.loadUsers();
      },
      error: (err) => {
        alert('Failed: ' + (err.error?.error || 'Server error'));
        this.isCreatingUser.set(false);
      }
    });
  }

  deleteUser(user: any): void {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    this.dataService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => alert('Failed: ' + (err.error?.error || 'Server error'))
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  resetSettings(): void {
    this.emailNotifications.set(true);
    this.browserNotifications.set(true);
    this.soundAlerts.set(false);
    this.confidenceThreshold = 90;
    this.refreshInterval = '3';
    this.systemMode = 'ids';
    localStorage.setItem('refreshInterval', '3');
  }

  clearAlerts(): void {
    if (!confirm('Are you sure you want to delete ALL alerts? This cannot be undone.')) return;
    this.dataService.clearAlerts().subscribe({
      next: (res) => alert(res.message || 'All alerts cleared'),
      error: (err) => alert('Failed: ' + (err.error?.error || 'Server error'))
    });
  }

  resetStatistics(): void {
    if (!confirm('WARNING: This will delete ALL predictions, alerts, and blocked IPs. Are you absolutely sure?')) return;
    this.dataService.resetStats().subscribe({
      next: (res) => alert(res.message || 'Statistics reset'),
      error: (err) => alert('Failed: ' + (err.error?.error || 'Server error'))
    });
  }
}