import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
interface AnalysisResult {
  id: number;
  timestamp: Date;
  srcIp: string;
  dstIp: string;
  protocol: string;
  prediction: 'Benign' | 'Attack';
  confidence: number;
  status: 'Processed' | 'Needs Review';
}

interface AnalysisSummary {
  totalRows: number;
  attacks: number;
  benign: number;
  needsReview: number;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-page fade-in">
      <!-- Upload Section -->
      <div class="card upload-section" [class.dragging]="isDragging()">
        <div 
          class="upload-area"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input 
            #fileInput
            type="file" 
            accept=".csv"
            (change)="onFileSelect($event)"
            hidden
          />
          
          @if (!isProcessing() && !hasResults()) {
            <div class="upload-content">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <h3>Upload CSV File for Analysis</h3>
              <p>Drag and drop your network flow CSV file here, or click to browse</p>
              <span class="supported-formats">Supported format: .csv</span>
            </div>
          }
          
          @if (isProcessing()) {
            <div class="processing-content">
              <div class="processing-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <h3>Processing {{ fileName() }}...</h3>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="progress()"></div>
                </div>
                <span class="progress-text">{{ progress() }}%</span>
              </div>
              <p>Analyzing network flows with ML model</p>
            </div>
          }
          
          @if (hasResults() && !isProcessing()) {
            <div class="results-header-content">
              <div class="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Analysis Complete</h3>
              <p>{{ fileName() }} has been processed</p>
              <button class="btn btn-secondary" (click)="reset(); $event.stopPropagation()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Another File
              </button>
            </div>
          }
        </div>
      </div>
      
      @if (hasResults()) {
        <!-- Results Summary -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ summary().totalRows | number }}</span>
              <span class="summary-label">Total Rows</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon red">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ summary().attacks | number }}</span>
              <span class="summary-label">Attacks Found</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ summary().benign | number }}</span>
              <span class="summary-label">Benign</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ summary().needsReview | number }}</span>
              <span class="summary-label">Needs Review</span>
            </div>
          </div>
        </div>
        
        <!-- Results Table -->
        <div class="card table-section">
          <div class="table-header">
            <h3>Analysis Results</h3>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-primary" (click)="downloadResults()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download CSV
              </button>
              <button class="btn btn-secondary" (click)="downloadPdf()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                PDF Report
              </button>
              <button class="btn btn-secondary" (click)="downloadLast24h()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Last 24h Report
              </button>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (result of paginatedResults(); track result.id) {
                  <tr [class.row-needs-review]="result.needs_review">
                    <td class="text-muted">#{{ result.id }}</td>
                    <td>{{ formatDate(result.timestamp) }}</td>
                    <td><code class="ip-code">{{ result.src_ip }}</code></td>
                    <td><code class="ip-code">{{ result.dst_ip }}</code></td>
                    <td><span class="protocol-badge">{{ getProtocolName(result.protocol) }}</span></td>
                    <td>
                      <span class="badge" [class.badge-success]="result.prediction === 'Benign'" [class.badge-danger]="result.prediction === 'Attack'">
                        {{ result.prediction }}
                      </span>
                    </td>
                    <td>
                      <div class="confidence-cell">
                        <span 
                          class="confidence-value"
                          [class.high]="result.confidence >= 90"
                          [class.medium]="result.confidence >= 70 && result.confidence < 90"
                          [class.low]="result.confidence < 70"
                        >{{ result.confidence }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class.badge-info]="!result.needs_review" [class.badge-warning]="result.needs_review">
                        {{ result.needs_review ? 'Needs Review' : 'Processed' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          @if (results().length > pageSize) {
            <div class="pagination-container">
              <div class="pagination-info">
                Showing {{ (currentPage() - 1) * pageSize + 1 }} to {{ Math.min(currentPage() * pageSize, results().length) }} of {{ results().length }}
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
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .upload-section {
      padding: 0;
      margin-bottom: 1.5rem;
      transition: border-color 0.2s ease;
    }
    
    .upload-section.dragging {
      border-color: var(--accent-blue);
      background-color: rgba(59, 130, 246, 0.05);
    }
    
    .upload-area {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      padding: 2rem;
      cursor: pointer;
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-lg);
      transition: all 0.2s ease;
    }
    
    .upload-area:hover {
      border-color: var(--accent-blue);
      background-color: rgba(59, 130, 246, 0.02);
    }
    
    .upload-content,
    .processing-content,
    .results-header-content {
      text-align: center;
    }
    
    .upload-icon,
    .processing-icon,
    .success-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-bottom: 1rem;
    }
    
    .upload-icon {
      background-color: rgba(59, 130, 246, 0.1);
      color: var(--accent-blue);
    }
    
    .processing-icon {
      background-color: rgba(249, 115, 22, 0.1);
      color: var(--color-orange);
      animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .success-icon {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-benign);
    }
    
    .upload-content h3,
    .processing-content h3,
    .results-header-content h3 {
      font-size: 1.125rem;
      margin-bottom: 0.5rem;
    }
    
    .upload-content p,
    .processing-content p,
    .results-header-content p {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    
    .supported-formats {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .progress-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      max-width: 300px;
      margin: 1rem auto;
    }
    
    .progress-bar {
      flex: 1;
      height: 8px;
      background-color: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-blue), #60a5fa);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--accent-blue);
      min-width: 40px;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .summary-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }
    
    .summary-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
    }
    
    .summary-icon.blue {
      background-color: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
    }
    
    .summary-icon.red {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--color-attack);
    }
    
    .summary-icon.green {
      background-color: rgba(34, 197, 94, 0.15);
      color: var(--color-benign);
    }
    
    .summary-icon.orange {
      background-color: rgba(249, 115, 22, 0.15);
      color: var(--color-orange);
    }
    
    .summary-content {
      display: flex;
      flex-direction: column;
    }
    
    .summary-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    
    .summary-label {
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
    
    .table-header h3 {
      font-size: 1rem;
      font-weight: 600;
    }
    
    .ip-code {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.8125rem;
      padding: 0.125rem 0.375rem;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-sm);
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
    }
    
    .confidence-value {
      font-size: 0.8125rem;
      font-weight: 500;
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
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 640px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UploadComponent {
  Math = Math;
  pageSize = 50;
  currentPage = signal(1);

  isDragging = signal(false);
  isProcessing = signal(false);
  progress = signal(0);
  fileName = signal('');

  // Données API
  batchId = signal<string | null>(null);
  results = signal<any[]>([]);
  summary = signal<any>({ totalRows: 0, attacks: 0, benign: 0, needsReview: 0 });

  hasResults = computed(() => this.results().length > 0);
  totalPages = computed(() => Math.ceil(this.results().length / this.pageSize));

  paginatedResults = computed(() => {
    const data = this.results();
    const start = (this.currentPage() - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  });

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

  constructor(private dataService: DataService) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) this.processFile(files[0]);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) this.processFile(input.files[0]);
  }

  private processFile(file: File): void {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    this.fileName.set(file.name);
    this.isProcessing.set(true);
    this.progress.set(30);

    this.dataService.uploadCsv(file).subscribe({
      next: (res) => {
        this.batchId.set(res.batch_id);
        this.progress.set(70);

        // Récupérer les résultats détaillés
        this.dataService.getBatchResults(res.batch_id).subscribe({
          next: (detail) => {
            this.results.set(detail.results || []);
            this.summary.set({
              totalRows:   detail.total,
              attacks:     detail.attacks,
              benign:      detail.benign,
              needsReview: detail.needs_review
            });
            this.progress.set(100);
            this.isProcessing.set(false);
          },
          error: (err) => {
            console.error('Results error', err);
            // Utiliser le résumé du batch même sans détails
            this.summary.set({
              totalRows:   res.total,
              attacks:     res.attacks,
              benign:      res.benign,
              needsReview: res.needs_review
            });
            this.progress.set(100);
            this.isProcessing.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Upload error', err);
        alert('Upload failed: ' + (err.error?.error || 'Server error'));
        this.isProcessing.set(false);
      }
    });
  }

  reset(): void {
    this.results.set([]);
    this.batchId.set(null);
    this.summary.set({ totalRows: 0, attacks: 0, benign: 0, needsReview: 0 });
    this.fileName.set('');
    this.progress.set(0);
    this.currentPage.set(1);
  }

  downloadResults(): void {
    const id = this.batchId();
    if (id) {
      this.dataService.downloadReport(id, 'csv');
    }
  }

  downloadPdf(): void {
    const id = this.batchId();
    if (id) {
      this.dataService.downloadReport(id, 'pdf');
    }
  }

  downloadLast24h(): void {
    this.dataService.downloadLast24hReport('pdf');
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
    }
  }

  getProtocolName(protocol: number): string {
    const protocols: Record<number, string> = {
      6: 'TCP', 17: 'UDP', 1: 'ICMP', 0: 'HOPOPT'
    };
    return protocols[protocol] || `${protocol}`;
  }
}