import { Component, signal,OnInit } from '@angular/core';
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
          
          <div class="form-row">
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="input" [(ngModel)]="email" placeholder="Enter your email" />
            </div>
            <div class="form-group">
              <label>Display Name</label>
              <input type="text" class="input" [(ngModel)]="displayName" placeholder="Enter display name" />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Notifications Section -->
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
            <button 
              class="toggle-btn" 
              [class.active]="emailNotifications()"
              (click)="emailNotifications.set(!emailNotifications())"
            >
              <span class="toggle-slider"></span>
            </button>
          </div>
          
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Browser Notifications</span>
              <span class="toggle-description">Show desktop notifications for new alerts</span>
            </div>
            <button 
              class="toggle-btn" 
              [class.active]="browserNotifications()"
              (click)="browserNotifications.set(!browserNotifications())"
            >
              <span class="toggle-slider"></span>
            </button>
          </div>
          
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Sound Alerts</span>
              <span class="toggle-description">Play sound when new attack is detected</span>
            </div>
            <button 
              class="toggle-btn" 
              [class.active]="soundAlerts()"
              (click)="soundAlerts.set(!soundAlerts())"
            >
              <span class="toggle-slider"></span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Detection Settings -->
      <div class="card settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3>Detection Settings</h3>
            <p>Configure detection sensitivity and thresholds</p>
          </div>
        </div>
        
        <div class="settings-content">
          <div class="form-group">
            <label>Confidence Threshold for Review</label>
            <div class="slider-container">
              <input 
                type="range" 
                class="slider" 
                min="50" 
                max="95" 
                [(ngModel)]="confidenceThreshold"
              />
              <span class="slider-value">{{ confidenceThreshold }}%</span>
            </div>
            <span class="input-hint">Flows below this confidence will be marked for review</span>
          </div>
          
          <div class="form-group">
            <label>Auto-Refresh Interval</label>
            <select class="input select" [(ngModel)]="refreshInterval">
              <option value="1">1 second</option>
              <option value="3">3 seconds</option>
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
            </select>
            <span class="input-hint">How often to refresh the live monitor</span>
          </div>
          
          <div class="form-group">
            <label>Alert Severity Threshold</label>
            <select class="input select" [(ngModel)]="severityThreshold">
              <option value="all">All Severities</option>
              <option value="medium">Medium and Above</option>
              <option value="high">High Only</option>
            </select>
            <span class="input-hint">Minimum severity level for notifications</span>
          </div>
        </div>
      </div>
      
      <!-- Danger Zone -->
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
            <button class="btn btn-danger">Clear Alerts</button>
          </div>
          
          <div class="danger-action">
            <div class="danger-info">
              <span class="danger-label">Reset Statistics</span>
              <span class="danger-description">Reset all statistics counters to zero.</span>
            </div>
            <button class="btn btn-danger">Reset Stats</button>
          </div>
        </div>
      </div>
      
      <!-- Save Button -->
      <div class="save-section">
        <button class="btn btn-secondary" (click)="resetSettings()">Reset to Defaults</button>
        <button class="btn btn-primary" (click)="saveSettings()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Changes
        </button>
        @if (saveSuccess()) {
            <span style="color: var(--color-benign); font-size: 0.875rem;">✓ Saved successfully</span>
          }
       @if (saveError()) {
            <span style="color: var(--color-attack); font-size: 0.875rem;">✗ Save failed</span>
}
      </div>
    </div>
  `,
  styles: [`
    .settings-section {
      margin-bottom: 1.5rem;
    }
    
    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1.5rem;
    }
    
    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background-color: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }
    
    .section-icon.danger {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--color-attack);
    }
    
    .section-header h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .section-header p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }
    
    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-group label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
    
    .input-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-color);
    }
    
    .toggle-row:last-child {
      border-bottom: none;
    }
    
    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .toggle-label {
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .toggle-description {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .toggle-btn {
      position: relative;
      width: 48px;
      height: 26px;
      background-color: var(--bg-tertiary);
      border: none;
      border-radius: 13px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .toggle-btn.active {
      background-color: var(--accent-blue);
    }
    
    .toggle-slider {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }
    
    .toggle-btn.active .toggle-slider {
      transform: translateX(22px);
    }
    
    .slider-container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .slider {
      flex: 1;
      height: 6px;
      background-color: var(--bg-tertiary);
      border-radius: 3px;
      -webkit-appearance: none;
      appearance: none;
    }
    
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      background-color: var(--accent-blue);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }
    
    .slider-value {
      min-width: 50px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--accent-blue);
    }
    
    .danger-zone {
      border-color: rgba(239, 68, 68, 0.3);
    }
    
    .danger-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background-color: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: var(--radius-md);
    }
    
    .danger-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .danger-label {
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .danger-description {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .btn-danger {
      background-color: var(--color-attack);
      color: white;
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .btn-danger:hover {
      background-color: #dc2626;
    }
    
    .save-section {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1rem;
    }
    
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .danger-action {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .save-section {
        flex-direction: column;
      }
      
      .save-section .btn {
        width: 100%;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  email = '';
  displayName = '';

  emailNotifications = signal(true);
  browserNotifications = signal(true);
  soundAlerts = signal(false);

  confidenceThreshold = 80;
  refreshInterval = '3';
  severityThreshold = 'all';

  saveSuccess = signal(false);
  saveError = signal(false);

  constructor(
    public authService: AuthService,
    private dataService: DataService
  ) {}

ngOnInit(): void {
  this.dataService.getSettings().subscribe({
    next: (res: any) => {
      this.emailNotifications.set(res.notifications ?? true);
    },
    error: (err: any) => console.error('Settings error', err)
  });
}

saveSettings(): void {
  this.saveSuccess.set(false);
  this.saveError.set(false);

  const body = {
    theme: 'dark',
    language: 'en',
    notifications: this.emailNotifications()
  };

  this.dataService.updateSettings(body).subscribe({
    next: () => {
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    },
    error: (err: any) => {
      console.error('Save error', err);
      this.saveError.set(true);
      setTimeout(() => this.saveError.set(false), 3000);
    }
  });
}

  resetSettings(): void {
    this.emailNotifications.set(true);
    this.browserNotifications.set(true);
    this.soundAlerts.set(false);
    this.confidenceThreshold = 80;
    this.refreshInterval = '3';
    this.severityThreshold = 'all';
  }
}