import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs';

export interface User {
  username: string;
  role: 'admin' | 'analyst';
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  private userSignal = signal<User | null>(null);

  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token    = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role     = localStorage.getItem('role') as 'admin' | 'analyst';
    if (token && username && role) {
      this.userSignal.set({ token, username, role });
    }
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${this.api}/api/auth/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('token',    res.token);
        localStorage.setItem('username', res.username);
        localStorage.setItem('role',     res.role);
        this.userSignal.set({ token: res.token, username: res.username, role: res.role });
      })
    );
  }

  logout(): void {
    this.userSignal.set(null);
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    const user = this.userSignal();
    return user?.role === 'admin';

  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<any>(`${this.api}/api/auth/change-password`, { currentPassword, newPassword });
  }

  register(username: string, password: string, role: string) {
    return this.http.post<any>(`${this.api}/api/auth/register`, { username, password, role });
  }
}