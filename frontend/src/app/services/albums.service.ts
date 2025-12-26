import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AlbumsService {
  private apiUrl = `${environment.apiUrl}/albums`;
  constructor(private http: HttpClient, private auth: AuthService) {}

  async mine(): Promise<any[]> {
    const res = await this.http.get<any[]>(`${this.apiUrl}/mine`, this.auth.getAuthHeaders()).toPromise();
    return res || [];
  }

  async create(title: string): Promise<any> {
    const csrf = await this.auth.fetchCsrf();
    const headers = new HttpHeaders({
      ...(this.auth.getAuthHeaders().headers?.keys().reduce((acc: any, k) => ({ ...acc, [k]: this.auth.getAuthHeaders().headers!.get(k)! }), {}) || {}),
      'X-CSRF-Token': csrf || ''
    });
    const res = await this.http.post<any>(`${this.apiUrl}/`, { title }, { headers }).toPromise();
    return res;
  }

  async remove(id: string): Promise<void> {
    const csrf = await this.auth.fetchCsrf();
    const headers = new HttpHeaders({
      ...(this.auth.getAuthHeaders().headers?.keys().reduce((acc: any, k) => ({ ...acc, [k]: this.auth.getAuthHeaders().headers!.get(k)! }), {}) || {}),
      'X-CSRF-Token': csrf || ''
    });
    await this.http.delete(`${this.apiUrl}/${id}`, { headers }).toPromise();
  }

  async trackShare(id: string, channel: string, ok: boolean, meta?: any): Promise<void> {
    const csrf = await this.auth.fetchCsrf();
    const headers = new HttpHeaders({
      ...(this.auth.getAuthHeaders().headers?.keys().reduce((acc: any, k) => ({ ...acc, [k]: this.auth.getAuthHeaders().headers!.get(k)! }), {}) || {}),
      'X-CSRF-Token': csrf || ''
    });
    await this.http.post(`${this.apiUrl}/${id}/share/track`, { channel, ok, meta }, { headers }).toPromise();
  }

  async ensureShareLink(id: string): Promise<{ shareId: string; shareLink: string }> {
    const csrf = await this.auth.fetchCsrf();
    const headers = new HttpHeaders({
      ...(this.auth.getAuthHeaders().headers?.keys().reduce((acc: any, k) => ({ ...acc, [k]: this.auth.getAuthHeaders().headers!.get(k)! }), {}) || {}),
      'X-CSRF-Token': csrf || ''
    });
    const res = await this.http.post<any>(`${this.apiUrl}/${id}/share/ensure`, {}, { headers }).toPromise();
    return { shareId: res?.shareId, shareLink: res?.shareLink };
  }
}
