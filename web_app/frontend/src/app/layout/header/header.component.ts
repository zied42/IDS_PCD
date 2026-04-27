import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="header-left">
        <h2 class="page-title">{{ getPageTitle() }}</h2>
      </div>
      
      <div class="header-right">
        <div class="status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">System Active</span>
        </div>
        
        <div class="user-menu">
          <div class="user-avatar">
            {{ getUserInitial() }}
          </div>
          <div class="user-info">
            <span class="user-name">{{ authService.user()?.username }}</span>
            <span class="user-role badge" [class.badge-info]="authService.user()?.role === 'admin'" [class.badge-success]="authService.user()?.role === 'analyst'">
              {{ authService.user()?.role }}
            </span>
          </div>
          <button class="logout-btn" (click)="logout()" title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    
    .page-title {
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      background-color: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 9999px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background-color: var(--color-benign);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .status-text {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-benign);
    }
    
    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%);
      border-radius: 50%;
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    
    .user-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .user-role {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
    }
    
    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .logout-btn:hover {
      background-color: var(--bg-tertiary);
      color: var(--color-attack);
      border-color: var(--color-attack);
    }
    
    @media (max-width: 640px) {
      .status-indicator {
        display: none;
      }
      
      .user-info {
        display: none;
      }
    }
  `]
})
export class HeaderComponent {
  constructor(public authService: AuthService) {}
  
  getPageTitle(): string {
    const path = window.location.pathname;
    const titles: Record<string, string> = {
      '/live-monitor': 'Live Monitor',
      '/alerts': 'Alerts',
      '/blocked-ips': 'Blocked IPs',
      '/statistics': 'Statistics',
      '/upload': 'Upload & Analyze',
      '/model-info': 'Model Info',
      '/settings': 'Settings'
    };
    return titles[path] || 'Dashboard';
  }
  
  getUserInitial(): string {
    const user = this.authService.user();
    return user ? user.username.charAt(0).toUpperCase() : '?';
  }
  
  logout(): void {
    this.authService.logout();
  }
}
