import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

// ── Interfaces ──────────────────────────────────────────
export interface FlowRecord {
  id: number;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: number;
  prediction: 'Benign' | 'Attack';
  confidence: number;
  model_used: string;
  needs_review: boolean;
}

export interface Alert {
  id: number;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  confidence: number;
  severity: 'High' | 'Medium' | 'Low';
  status: 'open' | 'reviewed' | 'resolved';
  prediction_id: number;
}

export interface BlockedIP {
  id: number;
  ip_address: string;
  reason: string;
  confidence: number | null;
  blocked_at: string;
  auto_blocked: boolean;
  status: 'active' | 'unblocked';
  prediction_id: number | null;
  unblocked_at: string | null;
  attack_count: number;
  firewall_blocked: boolean;
}

export interface LiveStats {
  today: {
    total: number;
    attacks: number;
    benign: number;
    attack_rate: number;
  };
  yesterday: {
    total: number;
    attacks: number;
    attack_rate: number;
  };
  open_alerts: number;
}

// ── Service ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DataService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Stats
  getLiveStats()        { return this.http.get<LiveStats>(`${this.api}/api/stats/live`); }
  getHourlyStats()      { return this.http.get<any[]>(`${this.api}/api/stats/hourly`); }
  getDistribution()     { return this.http.get<any>(`${this.api}/api/stats/distribution`); }

  // Live Monitor
  getPredictions(page = 1, perPage = 50) {
    return this.http.get<any>(`${this.api}/api/predictions`, {
      params: { page, per_page: perPage }
    });
  }

  // Alerts
  getAlerts(params?: any)  { return this.http.get<any>(`${this.api}/api/alerts`, { params }); }
  getAlertsSummary()       { return this.http.get<any>(`${this.api}/api/alerts/summary`); }
  updateAlertStatus(id: number, status: string) {
    return this.http.put<any>(`${this.api}/api/alerts/${id}`, { status });
  }

  // Upload / Batch
  uploadCsv(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.api}/api/predict/batch`, form);
  }
  getBatches()              { return this.http.get<any[]>(`${this.api}/api/batches`); }
  deleteBatch(id: string)   { return this.http.delete<any>(`${this.api}/api/batches/${id}`); }
  getBatchResults(id: string) { return this.http.get<any>(`${this.api}/api/analyze/results/${id}`); }
  downloadReport(batchId: string, format = 'csv') {
    const token = localStorage.getItem('token');
    window.open(
      `${this.api}/api/export/report?batch_id=${batchId}&format=${format}&token=${token}`,
      '_blank'
    );
  }

  // Model
  getModelInfo()            { return this.http.get<any>(`${this.api}/api/model/info`); }
  getModelList()            { return this.http.get<any>(`${this.api}/api/model/list`); }
  switchModel(model: string){ return this.http.put<any>(`${this.api}/api/model/switch`, { model }); }

  // Settings
  getSettings()             { return this.http.get<any>(`${this.api}/api/settings`); }
  updateSettings(body: any) { return this.http.put<any>(`${this.api}/api/settings`, body); }

  // Blocked IPs
  getBlockedIPs(params?: any) {
    return this.http.get<any>(`${this.api}/api/blocked-ips`, { params });
  }
  getBlockedIPsSummary() {
    return this.http.get<any>(`${this.api}/api/blocked-ips/summary`);
  }
  blockIP(ip_address: string, reason?: string) {
    return this.http.post<any>(`${this.api}/api/blocked-ips`, { ip_address, reason });
  }
  unblockIP(id: number) {
    return this.http.delete<any>(`${this.api}/api/blocked-ips/${id}`);
  }
  checkIP(ip: string) {
    return this.http.get<any>(`${this.api}/api/blocked-ips/check/${ip}`);
  }
}