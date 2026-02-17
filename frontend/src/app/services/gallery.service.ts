import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) { }

  getPhotos(): Observable<string[]> {
    const opts = this.auth.getAuthHeaders();
    return this.http.get<string[]>(`${this.apiUrl}/photos`, opts);
  }

  uploadPhotos(formData: FormData): Observable<any> {
    const baseOpts = this.auth.getAuthHeaders();
    const opts: any = {
      ...baseOpts,
      reportProgress: true,
      observe: 'events' as const
    };
    return this.http.post(`${this.apiUrl}/upload`, formData, opts);
  }

  getDownloadAllUrl(): string {
    return `${this.apiUrl}/download-all`;
  }

  deletePhoto(photoName: string): Observable<any> {
    const opts = this.auth.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/photos/${photoName}`, opts);
  }

  getDownloadSelectedUrl(): string {
    return `${this.apiUrl}/download-selected`;
  }
}
