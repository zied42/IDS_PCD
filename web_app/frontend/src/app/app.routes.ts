import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'live-monitor',
        pathMatch: 'full'
      },
      {
        path: 'live-monitor',
        loadComponent: () => import('./pages/live-monitor/live-monitor.component').then(m => m.LiveMonitorComponent)
      },
      {
        path: 'alerts',
        loadComponent: () => import('./pages/alerts/alerts.component').then(m => m.AlertsComponent)
      },
      {
        path: 'blocked-ips',
        loadComponent: () => import('./pages/blocked-ips/blocked-ips.component').then(m => m.BlockedIPsComponent)
      },
      {
        path: 'statistics',
        loadComponent: () => import('./pages/statistics/statistics.component').then(m => m.StatisticsComponent)
      },
      {
        path: 'upload',
        loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent)
      },
      {
        path: 'model-info',
        loadComponent: () => import('./pages/model-info/model-info.component').then(m => m.ModelInfoComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'live-monitor'
  }
];
