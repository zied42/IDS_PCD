import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h1>IDS Dashboard</h1>
          <p>Intrusion Detection System</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              [(ngModel)]="username"
              name="username"
              class="input"
              placeholder="Enter your username"
              required
              autocomplete="username"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              class="input"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />
          </div>
          
          @if (error()) {
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              {{ error() }}
            </div>
          }
          
          <button type="submit" class="btn btn-primary login-btn" [disabled]="isLoading()">
            @if (isLoading()) {
              <span class="spinner"></span>
              Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>
        <div class="login-footer">
          <p>IDS Platform — Authorized access only</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1f35 100%);
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 2.5rem;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%);
      border-radius: 50%;
      margin-bottom: 1rem;
      color: white;
    }
    
    .login-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    
    .login-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-attack);
      font-size: 0.875rem;
    }
    
    .login-btn {
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      margin-top: 0.5rem;
    }
    
    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .login-footer {
      margin-top: 1.5rem;
      text-align: center;
    }
    
    .login-footer p {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  error = signal<string>('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/live-monitor']);
    }
  }

  onSubmit(): void {
    this.error.set('');

    if (!this.username || !this.password) {
      this.error.set('Please enter both username and password');
      return;
    }

    this.isLoading.set(true);

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/live-monitor']);
      },
      error: (err: any) => {
        if (err.status === 401) {
          this.error.set('Invalid username or password');
        } else {
          this.error.set('Server error, please try again');
        }
        this.isLoading.set(false);
      }
    });
  }
}