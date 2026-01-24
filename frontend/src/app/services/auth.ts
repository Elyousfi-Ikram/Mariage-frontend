import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(false);
  private tokenKey = 'auth_token';
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.tokenKey);
    if (token) this.loggedIn.next(true);
  }

  get isLoggedIn() {
    return this.loggedIn.asObservable();
  }

  // Compatibilité avec l'ancien flux (mot de passe simple)
  login(password: string): boolean {
    if (password && password.length > 0) {
      this.loggedIn.next(true);
      return true;
    }
    return false;
  }

  async fetchCsrf(): Promise<string | null> {
    try {
      const res: any = await this.http.get(`${this.apiUrl}/csrf`).toPromise();
      return res?.csrfToken || null;
    } catch {
      return null;
    }
  }

  async register(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Sending register request:', { email, name }); // Do not log password
      await this.http.post(`${this.apiUrl}/register`, { email, password, name }).toPromise();
      return { success: true };
    } catch (e: any) {
      console.error('Register error:', e);
      return { success: false, error: e?.error?.message || 'Erreur inscription' };
    }
  }

  async loginWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res: any = await this.http.post(`${this.apiUrl}/login`, { email, password }).toPromise();
      const token = res?.token;
      if (token) {
        localStorage.setItem(this.tokenKey, token);
        this.loggedIn.next(true);
        return { success: true };
      }
      return { success: false, error: 'Token manquant' };
    } catch (e: any) {
      return { success: false, error: e?.error?.message || 'Connexion échouée' };
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.loggedIn.next(false);
  }

  getAuthHeaders() {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return {};
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }
}
