import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-model-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="model-info-page fade-in">
      <!-- Model Header -->
      <div class="card model-header">
        <div class="model-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="model-details">
          <div class="model-name-row">
            <h2>{{ modelInfo().model_name }}</h2>
            <span class="badge badge-success">{{ activeModel() }}</span>
          </div>
          <p class="model-description">{{ modelInfo().model_type }}</p>
          <div class="model-meta">
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Version {{ modelInfo().version }}
            </span>
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Features: {{ modelInfo().n_features }}
            </span>
          </div>

          @if (isAdmin) {
            <div class="model-switcher">
              <span>Switch Model:</span>
              @for (m of availableModels(); track m) {
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="m === activeModel()"
                  [class.btn-secondary]="m !== activeModel()"
                  (click)="switchModel(m)"
                >
                  {{ m }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Balanced Accuracy</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="metric-value">{{ modelMetrics().bal_accuracy }}%</div>
          <div class="metric-bar">
            <div class="metric-fill" [style.width.%]="modelMetrics().bal_accuracy"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">F1 Macro</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="metric-value">{{ modelMetrics().f1_macro }}%</div>
          <div class="metric-bar">
            <div class="metric-fill" [style.width.%]="modelMetrics().f1_macro"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Attack Recall</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="metric-value attack">{{ modelMetrics().attack_recall }}%</div>
          <div class="metric-bar attack">
            <div class="metric-fill" [style.width.%]="modelMetrics().attack_recall"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Benign Recall</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="metric-value benign">{{ modelMetrics().benign_recall }}%</div>
          <div class="metric-bar benign">
            <div class="metric-fill" [style.width.%]="modelMetrics().benign_recall"></div>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="card features-section">
        <div class="features-header">
          <h3>Model Features</h3>
          <span class="feature-count">{{ features().length }} features</span>
        </div>
        <p class="features-description">
          The model uses the following {{ modelInfo().n_features }} network flow features for classification:
        </p>
        <div class="features-grid">
          @for (feature of features(); track feature) {
            <div class="feature-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ feature }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .model-header {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .model-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%);
      border-radius: var(--radius-lg);
      color: white;
      flex-shrink: 0;
    }

    .model-details { flex: 1; }

    .model-name-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .model-name-row h2 { font-size: 1.25rem; font-weight: 600; }

    .model-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .model-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .model-switcher {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.75rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      padding: 1.25rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .metric-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .metric-label { font-size: 0.8125rem; color: var(--text-secondary); }
    .metric-header svg { color: var(--text-muted); }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent-blue);
      margin-bottom: 0.75rem;
    }

    .metric-value.attack { color: var(--color-attack); }
    .metric-value.benign { color: var(--color-benign); }

    .metric-bar {
      height: 6px;
      background-color: var(--bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
    }

    .metric-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-blue), #60a5fa);
      border-radius: 3px;
    }

    .metric-bar.attack .metric-fill {
      background: linear-gradient(90deg, var(--color-attack), #f87171);
    }

    .metric-bar.benign .metric-fill {
      background: linear-gradient(90deg, var(--color-benign), #4ade80);
    }

    .features-section { padding: 1.5rem; }

    .features-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .features-header h3 { font-size: 1rem; font-weight: 600; }
    .feature-count { font-size: 0.8125rem; color: var(--text-muted); }

    .features-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
    }

    .feature-item svg { color: var(--color-benign); flex-shrink: 0; }

    @media (max-width: 1200px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .features-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 768px) {
      .model-header { flex-direction: column; align-items: flex-start; }
      .metrics-grid { grid-template-columns: 1fr; }
      .features-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 480px) {
      .features-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ModelInfoComponent implements OnInit {
  modelInfo = signal<any>({
    model_name: '—',
    version: '—',
    model_type: '—',
    n_features: 0
  });

  modelMetrics = signal<any>({
    bal_accuracy: 0,
    f1_macro: 0,
    attack_recall: 0,
    benign_recall: 0
  });

  features = signal<string[]>([]);
  availableModels = signal<string[]>([]);
  activeModel = signal<string>('');
  isAdmin = false;

  constructor(
    private dataService: DataService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.loadModelInfo();
  }

  private loadModelInfo(): void {
    this.dataService.getModelInfo().subscribe({
      next: (res) => {
        this.modelInfo.set(res);
        this.modelMetrics.set(res);
        this.features.set(res.features || []);
        this.availableModels.set(res.available_models || []);
        this.activeModel.set(res.model_name);
      },
      error: (err) => console.error('Model info error', err)
    });
  }

  switchModel(model: string): void {
    if (!this.isAdmin) return;
    this.dataService.switchModel(model).subscribe({
      next: () => this.loadModelInfo(),
      error: (err) => console.error('Switch error', err)
    });
  }
}