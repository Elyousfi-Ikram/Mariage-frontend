import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getPhotos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/photos`);
  }

  uploadPhotos(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  getDownloadAllUrl(): string {
    return `${this.apiUrl}/download-all`;
  }

  deletePhoto(photoName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/photos/${photoName}`);
  }

  getDownloadSelectedUrl(): string {
    return `${this.apiUrl}/download-selected`;
  }
}
