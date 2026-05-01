import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <span class="logo-text">IDS Dashboard</span>
      </div>

      <nav class="nav-menu">

        <a routerLink="/live-monitor" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </span>
          <span class="nav-label">Live Monitor</span>
        </a>

        <a routerLink="/alerts" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <span class="nav-label">Alerts</span>
        </a>

        <a routerLink="/blocked-ips" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </span>
          <span class="nav-label">Blocked IPs</span>
        </a>

        <a routerLink="/statistics" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
          </span>
          <span class="nav-label">Statistics</span>
        </a>

        @if (authService.isAdmin()) {
          <div class="nav-divider"><span class="nav-divider-label">Admin</span></div>

          <a routerLink="/upload" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </span>
            <span class="nav-label">Upload & Analyze</span>
          </a>

          <a routerLink="/model-info" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            </span>
            <span class="nav-label">Model Info</span>
          </a>
        }

        <a routerLink="/settings" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
          <span class="nav-label">Settings</span>
        </a>

      </nav>

      <div class="sidebar-footer">
        <div class="version-badge">v1.0.0</div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 260px;
      background-color: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      z-index: 100;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem;
      border-bottom: 1px solid var(--border-color);
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%);
      border-radius: var(--radius-md);
      color: white;
    }

    .logo-text {
      font-weight: 700;
      font-size: 1rem;
    }

    .nav-menu {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .nav-item.active {
      background-color: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-icon svg {
      width: 20px;
      height: 20px;
    }

    .nav-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .version-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    @media (max-width: 1024px) {
      .sidebar { width: 72px; }
      .logo-text, .nav-label, .sidebar-footer, .nav-divider { display: none; }
      .sidebar-header { justify-content: center; padding: 1rem; }
      .nav-item { justify-content: center; padding: 0.875rem; }
    }

    .nav-divider { margin: 0.75rem 0 0.25rem; padding: 0 1rem; }
    .nav-divider-label {
      font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--text-muted);
    }
  `]
})
export class SidebarComponent {
  constructor(public authService: AuthService) {}
}