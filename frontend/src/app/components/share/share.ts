import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-share',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './share.html',
  styleUrls: ['./share.scss']
})
export class ShareComponent implements OnInit {
  title = '';
  expired = false;
  albumId = '';
  shareId = '';
  mode: 'view' | 'add' = 'view';
  password = '';
  loading = false;
  error = '';

  private apiUrl = `${environment.apiUrl}/albums`;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.albumId = this.route.snapshot.paramMap.get('albumId') || '';
    this.shareId = this.route.snapshot.paramMap.get('shareId') || '';
    if (!this.albumId || !this.shareId) {
      this.error = 'Lien invalide';
      return;
    }
    this.fetchInfo();
  }

  async fetchInfo() {
    this.loading = true;
    this.error = '';
    try {
      const res: any = await this.http.get(`${this.apiUrl}/${this.albumId}/share/${this.shareId}`).toPromise();
      this.title = res?.title || '';
      this.expired = !!res?.expired;
    } catch (e: any) {
      this.error = e?.error?.message || 'Impossible de charger l’album';
    } finally {
      this.loading = false;
    }
  }

  async submit() {
    if (this.expired) return;
    this.loading = true;
    this.error = '';
    try {
      const res: any = await this.http.post(
        `${this.apiUrl}/${this.albumId}/share/${this.shareId}/access`,
        { mode: this.mode, password: this.password }
      ).toPromise();
      const token = res?.token;
      if (token) {
        localStorage.setItem('auth_token', token);
        // Réactualise l’état de connexion
        // AuthService lit le token au démarrage, on déclenche la navigation
        this.router.navigate(['/gallery', this.albumId]);
        return;
      }
      this.error = 'Accès refusé';
    } catch (e: any) {
      this.error = e?.error?.message || 'Mot de passe invalide';
    } finally {
      this.loading = false;
    }
  }
}

