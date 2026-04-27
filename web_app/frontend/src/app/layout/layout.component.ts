import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { ToastContainerComponent } from './toast-container/toast-container.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, ToastContainerComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-header></app-header>
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
    <app-toast-container></app-toast-container>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }
    
    .main-content {
      flex: 1;
      margin-left: 260px;
      display: flex;
      flex-direction: column;
    }
    
    .page-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }
    
    @media (max-width: 1024px) {
      .main-content {
        margin-left: 72px;
      }
    }
  `]
})
export class LayoutComponent {}
