import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="statistics-page fade-in">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats().today.total | number }}</span>
            <span class="stat-label">Total Flows Today</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats().today.attack_rate }}%</span>
            <span class="stat-label">Attack Rate</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats().open_alerts }}</span>
            <span class="stat-label">Open Alerts</span>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="card chart-card">
          <div class="chart-header">
            <h3>Traffic Over Last 24 Hours</h3>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot red"></span>Attacks</span>
              <span class="legend-item"><span class="legend-dot green"></span>Benign</span>
            </div>
          </div>
          <div class="chart-container"><canvas #lineChart></canvas></div>
        </div>

        <div class="side-charts">
          <div class="card chart-card pie-card">
            <div class="chart-header"><h3>Traffic Distribution</h3></div>
            <div class="chart-container pie-container"><canvas #pieChart></canvas></div>
            <div class="pie-legend">
              <div class="pie-legend-item">
                <span class="legend-color green"></span>
                <span class="legend-label">Benign</span>
                <span class="legend-value">{{ benignPercent() }}%</span>
              </div>
              <div class="pie-legend-item">
                <span class="legend-color red"></span>
                <span class="legend-label">Attack</span>
                <span class="legend-value">{{ attackPercent() }}%</span>
              </div>
            </div>
          </div>

          <div class="card comparison-card">
            <div class="chart-header"><h3>Attack Rate Comparison</h3></div>
            <div class="comparison-content">
              <div class="comparison-row">
                <div class="comparison-label">
                  <span class="day">Today</span>
                  <span class="value">{{ stats().today.attack_rate }}%</span>
                </div>
                <div class="comparison-bar-container">
                  <div class="comparison-bar today" [style.width.%]="Math.min(stats().today.attack_rate * 4, 100)"></div>
                </div>
              </div>
              <div class="comparison-row">
                <div class="comparison-label">
                  <span class="day">Yesterday</span>
                  <span class="value">{{ stats().yesterday.attack_rate }}%</span>
                </div>
                <div class="comparison-bar-container">
                  <div class="comparison-bar yesterday" [style.width.%]="Math.min(stats().yesterday.attack_rate * 4, 100)"></div>
                </div>
              </div>
              <div class="comparison-delta" [class.positive]="rateChange() < 0" [class.negative]="rateChange() > 0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @if (rateChange() < 0) {
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                    <polyline points="17 18 23 18 23 12"/>
                  } @else {
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  }
                </svg>
                <span>{{ Math.abs(rateChange()).toFixed(1) }}% {{ rateChange() < 0 ? 'decrease' : 'increase' }} from yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); }
    .stat-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: var(--radius-md); }
    .stat-icon.blue { background-color: rgba(59, 130, 246, 0.15); color: var(--accent-blue); }
    .stat-icon.red { background-color: rgba(239, 68, 68, 0.15); color: var(--color-attack); }
    .stat-icon.orange { background-color: rgba(249, 115, 22, 0.15); color: var(--color-orange); }
    .stat-content { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); }
    .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
    .chart-card { padding: 1.25rem; }
    .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .chart-header h3 { font-size: 0.9375rem; font-weight: 600; }
    .chart-legend { display: flex; gap: 1rem; }
    .legend-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--text-secondary); }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
    .legend-dot.red { background-color: var(--color-attack); }
    .legend-dot.green { background-color: var(--color-benign); }
    .chart-container { height: 300px; position: relative; }
    .side-charts { display: flex; flex-direction: column; gap: 1.5rem; }
    .pie-card { flex: 1; }
    .pie-container { height: 180px; }
    .pie-legend { display: flex; justify-content: center; gap: 2rem; margin-top: 1rem; }
    .pie-legend-item { display: flex; align-items: center; gap: 0.5rem; }
    .legend-color { width: 12px; height: 12px; border-radius: 2px; }
    .legend-color.green { background-color: var(--color-benign); }
    .legend-color.red { background-color: var(--color-attack); }
    .legend-label { font-size: 0.8125rem; color: var(--text-secondary); }
    .legend-value { font-size: 0.8125rem; font-weight: 600; }
    .comparison-card { padding: 1.25rem; }
    .comparison-content { display: flex; flex-direction: column; gap: 1rem; }
    .comparison-row { display: flex; flex-direction: column; gap: 0.5rem; }
    .comparison-label { display: flex; justify-content: space-between; align-items: center; }
    .comparison-label .day { font-size: 0.8125rem; color: var(--text-secondary); }
    .comparison-label .value { font-size: 0.875rem; font-weight: 600; }
    .comparison-bar-container { height: 8px; background-color: var(--bg-tertiary); border-radius: 4px; overflow: hidden; }
    .comparison-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .comparison-bar.today { background: linear-gradient(90deg, var(--accent-blue), #60a5fa); }
    .comparison-bar.yesterday { background: linear-gradient(90deg, var(--bg-tertiary), #64748b); }
    .comparison-delta { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.8125rem; margin-top: 0.5rem; }
    .comparison-delta.positive { background-color: rgba(34, 197, 94, 0.1); color: var(--color-benign); }
    .comparison-delta.negative { background-color: rgba(239, 68, 68, 0.1); color: var(--color-attack); }
    @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .charts-grid { grid-template-columns: 1fr; } .side-charts { flex-direction: row; } }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr; } .side-charts { flex-direction: column; } }
  `]
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  Math = Math;

  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;

  private lineChart: Chart | null = null;
  private pieChart: Chart | null = null;

  stats = signal<any>({
    today: { total: 0, attacks: 0, benign: 0, attack_rate: 0 },
    yesterday: { attack_rate: 0 },
    open_alerts: 0
  });
  distribution = signal<any>({ benign_pct: 0, attack_pct: 0, benign: 0, attacks: 0 });

  benignPercent = () => this.distribution().benign_pct?.toFixed(1) || '0';
  attackPercent = () => this.distribution().attack_pct?.toFixed(1) || '0';
  rateChange = () => (this.stats().today.attack_rate || 0) - (this.stats().yesterday.attack_rate || 0);

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.getLiveStats().subscribe({
      next: (res: any) => this.stats.set(res),
      error: (err: any) => console.error(err)
    });

    this.dataService.getDistribution().subscribe({
      next: (res: any) => {
        this.distribution.set(res);
        if (this.pieChart) {
          this.pieChart.data.datasets[0].data = [res.benign, res.attacks];
          this.pieChart.update();
        }
      },
      error: (err: any) => console.error(err)
    });

    this.dataService.getHourlyStats().subscribe({
      next: (res: any[]) => {
        if (this.lineChart) {
          this.lineChart.data.labels = res.map((d: any) =>
            new Date(d.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          );
          this.lineChart.data.datasets[0].data = res.map((d: any) => d.attacks);
          this.lineChart.data.datasets[1].data = res.map((d: any) => d.benign);
          this.lineChart.update();
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  ngAfterViewInit(): void {
    this.initLineChart();
    this.initPieChart();
  }

  private initLineChart(): void {
    const ctx = this.lineChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Attacks', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
          { label: 'Benign', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1, padding: 12, cornerRadius: 8 } },
        scales: {
          x: { border: { display: false }, grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { border: { display: false }, grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b' }, beginAtZero: true }
        }
      }
    });
  }

  private initPieChart(): void {
    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Benign', 'Attack'],
        datasets: [{ data: [0, 0], backgroundColor: ['#22c55e', '#ef4444'], borderColor: ['#22c55e', '#ef4444'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1, padding: 12, cornerRadius: 8 } }
      }
    });
  }
}