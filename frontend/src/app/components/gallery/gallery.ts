import { Component, OnInit, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryService } from '../../services/gallery.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ReturnComponent } from '../return/return.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, ReturnComponent],
  templateUrl: './gallery.html',
  styleUrls: ['./gallery.scss']
})
export class GalleryComponent implements OnInit {
  photos: { url: string; alt: string; file?: File, progress?: number, error?: string }[] = [];
  selectedIndex: number | null = null;
  animationDirection: 'next' | 'prev' | null = null;
  currentAlbumId: string | null = null;
  selectionMode = false;
  private selectedSet = new Set<number>();
  @Output() selectionChange = new EventEmitter<{ url: string; alt: string }[]>();
  selectedDownloadProgress = 0;
  selectedDownloadError = '';
  private touchStartX: number | null = null;
  private touchEndX: number | null = null;
  imageLoading = false;
  zoomScale = 1;
  translateX = 0;
  translateY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private pinchStartDist: number | null = null;
  private baseScale = 1;
  rotationDeg = 0;

  constructor(private galleryService: GalleryService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const albumId = params.get('albumId');
      if (albumId) {
        this.currentAlbumId = albumId;
        this.loadAlbumPhotos(albumId);
      } else {
        // Charger d'abord les photos depuis le localStorage pour qu'elles s'affichent immédiatement
        this.loadPhotosFromLocalStorage();
        // Puis synchroniser avec l'API pour récupérer l'état réel
        this.loadPhotos();
      }
    });
  }

  loadPhotos() {
    this.galleryService.getPhotos().subscribe(photoUrls => {
      const sorted = this.sortUrlsDesc(photoUrls);
      this.photos = sorted.map(url => ({ url, alt: 'Photo' }));
      this.savePhotosToLocalStorage(photoUrls);
    });
  }

  private loadAlbumPhotos(albumId: string) {
    try {
      const raw = localStorage.getItem('albumMedia');
      const map = raw ? JSON.parse(raw) : {};
      const entry = map?.[albumId];
      const urls: string[] = Array.isArray(entry?.photoUrls) ? entry.photoUrls : [];
      const sorted = this.sortUrlsDesc(urls);
      this.photos = sorted.map(u => ({ url: u, alt: 'Photo' }));
      // La lightbox ne s'ouvre que sur clic utilisateur dans la galerie
    } catch {
      // Fallback si aucune donnée locale: recharger toutes les photos
      this.loadPhotosFromLocalStorage();
      this.loadPhotos();
    }
  }

  private loadPhotosFromLocalStorage() {
    try {
      const saved = localStorage.getItem('photos');
      if (!saved) return;
      const urls: string[] = JSON.parse(saved);
      if (Array.isArray(urls)) {
        const sorted = this.sortUrlsDesc(urls);
        this.photos = sorted.map(url => ({ url, alt: 'Photo' }));
      }
    } catch (_) {
      // ignorer les erreurs de parsing
    }
  }

  private savePhotosToLocalStorage(urls: string[]) {
    try {
      localStorage.setItem('photos', JSON.stringify(urls));
    } catch (_) {
      // ignorer les erreurs de stockage
    }
  }

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.clearSelection();
    }
  }

  isSelected(index: number): boolean {
    return this.selectedSet.has(index);
  }

  toggleSelection(index: number) {
    if (this.selectedSet.has(index)) {
      this.selectedSet.delete(index);
    } else {
      this.selectedSet.add(index);
    }
    this.emitSelection();
  }

  clearSelection() {
    this.selectedSet.clear();
    this.emitSelection();
  }

  cancelSelection() {
    this.selectionMode = false;
    this.clearSelection();
  }

  confirmSelection() {
    this.emitSelection();
    // rester en mode sélection mais l'émetteur notifie la sélection courante
  }

  private emitSelection() {
    const selected = Array.from(this.selectedSet.values())
      .map(i => this.photos[i])
      .filter(p => !!p)
      .map(p => ({ url: p.url, alt: p.alt }));
    this.selectionChange.emit(selected);
  }

  get selectionCount(): number {
    return this.selectedSet.size;
  }
  hasSelection(): boolean {
    return this.selectedSet.size > 0;
  }

  get allSelected(): boolean {
    return this.photos.length > 0 && this.selectedSet.size === this.photos.length;
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.clearSelection();
    } else {
      this.selectedSet = new Set(this.photos.map((_, i) => i));
      this.emitSelection();
    }
  }

  private getFilenameFromUrl(url: string): string | null {
    const idx = url.lastIndexOf('/images/');
    if (idx >= 0) return url.substring(idx + '/images/'.length);
    const last = url.split('/').pop();
    return last || null;
  }

  private async computeTotalSize(urls: string[]): Promise<number> {
    const heads = urls.map(async (u) => {
      try {
        const r = await fetch(u, { method: 'HEAD' });
        const len = r.headers.get('Content-Length');
        return len ? Number(len) : 0;
      } catch {
        return 0;
      }
    });
    const sizes = await Promise.all(heads);
    return sizes.reduce((a, b) => a + b, 0);
  }

  async downloadSelectedZip() {
    this.selectedDownloadError = '';
    this.selectedDownloadProgress = 0;
    const selectedUrls = Array.from(this.selectedSet.values()).map(i => this.photos[i]?.url).filter(Boolean) as string[];
    if (selectedUrls.length === 0) return;
    const MAX_BYTES = 100 * 1024 * 1024;
    try {
      const total = await this.computeTotalSize(selectedUrls);
      if (total > MAX_BYTES) {
        this.selectedDownloadError = 'Sélection trop volumineuse (>100 MB).';
        return;
      }
    } catch {}
    const filenames = selectedUrls.map(u => this.getFilenameFromUrl(u)).filter((v): v is string => !!v);
    const url = this.galleryService.getDownloadSelectedUrl();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames })
    });
    if (!resp.ok || !resp.body) {
      this.selectedDownloadError = 'Erreur de téléchargement.';
      return;
    }
    const contentLength = Number(resp.headers.get('Content-Length') || 0);
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (contentLength > 0) {
          this.selectedDownloadProgress = Math.floor((received / contentLength) * 100);
        }
      }
    }
    const parts = chunks.map(u8 => u8.slice());
    const blob = new Blob(parts, { type: 'application/zip' });
    const a = document.createElement('a');
    const now = new Date();
    const name = `selection_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.zip`;
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    this.selectedDownloadProgress = 100;
  }


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const filesToUpload = Array.from(input.files);

    filesToUpload.forEach(file => {
      if (!file.type.startsWith('image/')) {
        const errorEntry = {
          url: 'https://via.placeholder.com/300x200.png?text=Erreur',
          alt: file.name,
          error: 'Format non valide'
        };
        this.photos.push(errorEntry);
        return;
      }

      const photoEntry = {
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
        progress: 0
      };
      this.photos.push(photoEntry);
    });

    const formData = new FormData();
    filesToUpload.filter(f => f.type.startsWith('image/')).forEach(f => formData.append('photos', f));
    if (this.currentAlbumId) {
      formData.append('albumId', this.currentAlbumId);
      formData.append('coverIndex', '-1');
    }

    this.galleryService.uploadPhotos(formData).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        // Update progress for each file if backend provides per-file progress
        // This basic example uses a global progress for simplicity
        const totalProgress = Math.round(100 * event.loaded / (event.total || 1));
        this.photos.filter(p => p.file).forEach(p => p.progress = totalProgress);
      } else if (event instanceof HttpResponse) {
        const uploaded: string[] = event.body?.uploaded || [];
        if (this.currentAlbumId) {
          const newPhotos = uploaded.map(url => ({ url, alt: 'Photo' }));
          const merged = [...this.photos.filter(p => !p.file), ...newPhotos];
          this.photos = this.sortEntriesDesc(merged);
          try {
            const raw = localStorage.getItem('albumMedia');
            const map = raw ? JSON.parse(raw) : {};
            const entry = map?.[this.currentAlbumId] || { coverUrl: null, photoUrls: [] };
            entry.photoUrls = [...(entry.photoUrls || []), ...uploaded];
            map[this.currentAlbumId] = entry;
            localStorage.setItem('albumMedia', JSON.stringify(map));
          } catch {}
        } else {
          // Refresh photo list after upload (vue globale)
          this.loadPhotos();
        }
      }
    }, error => {
      console.error('Upload error:', error);
      // Mark relevant photos with an error
      this.photos.filter(p => p.file).forEach(p => p.error = 'Échec du téléversement');
    });
  }

  downloadAll() {
    window.open(this.galleryService.getDownloadAllUrl(), '_blank');
  }

  downloadPhoto(photo: { url: string; alt: string; }) {
    fetch(photo.url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = photo.alt;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }).catch(err => {
        console.error('Download failed', err);
        const p = this.photos.find(p => p.url === photo.url);
        if (p) p.error = "Échec du téléchargement";
      });
  }

  deletePhoto(photo: { url: string; alt: string; }) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return;
    }

    const photoName = photo.url.split('/').pop();
    if (!photoName) {
      console.error('Could not extract photo name from URL', photo.url);
      const p = this.photos.find(p => p.url === photo.url);
      if(p) p.error = "Impossible de supprimer l'image.";
      return;
    }

    this.galleryService.deletePhoto(photoName).subscribe({
      next: () => {
        this.photos = this.photos.filter(p => p.url !== photo.url);
        // Mettre à jour le localStorage pour la vue globale
        this.savePhotosToLocalStorage(this.photos.map(p => p.url));
        // Nettoyer l'entrée albumMedia si on est sur une galerie d'album
        if (this.currentAlbumId) {
          try {
            const raw = localStorage.getItem('albumMedia');
            const map = raw ? JSON.parse(raw) : {};
            const entry = map?.[this.currentAlbumId];
            if (entry?.photoUrls) {
              entry.photoUrls = entry.photoUrls.filter((u: string) => u !== photo.url);
              map[this.currentAlbumId] = entry;
              localStorage.setItem('albumMedia', JSON.stringify(map));
            }
          } catch {}
        }
      },
      error: (err) => {
        console.error('Delete error:', err);
        const p = this.photos.find(p => p.url === photo.url);
        if(p) p.error = 'Échec de la suppression';
      }
    });
  }

  async deleteSelected() {
    const indices = Array.from(this.selectedSet.values()).sort((a, b) => b - a);
    if (indices.length === 0) return;
    if (!confirm(`Supprimer ${indices.length} image(s) sélectionnée(s) ?`)) return;
    const toRemoveUrls = indices.map(i => this.photos[i]?.url).filter(Boolean) as string[];
    const names = toRemoveUrls.map(u => this.getFilenameFromUrl(u)).filter((v): v is string => !!v);
    const results = await Promise.allSettled(names.map(n => new Promise<void>((resolve, reject) => {
      this.galleryService.deletePhoto(n).subscribe({
        next: () => resolve(),
        error: () => reject()
      });
    })));
    const succeeded = new Set<string>();
    names.forEach((n, idx) => {
      if (results[idx].status === 'fulfilled') {
        const url = toRemoveUrls[idx];
        if (url) succeeded.add(url);
      }
    });
    if (succeeded.size > 0) {
      this.photos = this.photos.filter(p => !succeeded.has(p.url));
      this.savePhotosToLocalStorage(this.photos.map(p => p.url));
      if (this.currentAlbumId) {
        try {
          const raw = localStorage.getItem('albumMedia');
          const map = raw ? JSON.parse(raw) : {};
          const entry = map?.[this.currentAlbumId];
          if (entry?.photoUrls) {
            entry.photoUrls = entry.photoUrls.filter((u: string) => !succeeded.has(u));
            map[this.currentAlbumId] = entry;
            localStorage.setItem('albumMedia', JSON.stringify(map));
          }
        } catch {}
      }
    }
    this.clearSelection();
  }
  openLightbox(index: number) {
    this.selectedIndex = index;
    this.animationDirection = null;
    this.preloadAround(index);
    this.prepareImage(index);
  }

  closeLightbox() {
    this.selectedIndex = null;
    this.animationDirection = null;
    this.resetTransform();
  }

  closeGallery() {
    this.selectedIndex = null;
    if (this.currentAlbumId) {
      this.router.navigate(['/albums']);
    }
  }

  prev() {
    if (this.selectedIndex === null || this.photos.length === 0) return;
    this.animationDirection = 'prev';
    this.selectedIndex = (this.selectedIndex - 1 + this.photos.length) % this.photos.length;
    this.preloadAround(this.selectedIndex);
    this.prepareImage(this.selectedIndex);
  }

  next() {
    if (this.selectedIndex === null || this.photos.length === 0) return;
    this.animationDirection = 'next';
    this.selectedIndex = (this.selectedIndex + 1) % this.photos.length;
    this.preloadAround(this.selectedIndex);
    this.prepareImage(this.selectedIndex);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Sélection rapide Ctrl+A
    if (event.ctrlKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      if (!this.selectionMode) this.selectionMode = true;
      this.toggleSelectAll();
      return;
    }
    if (this.selectedIndex === null) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      this.rotate();
    }
  }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      const a = event.touches[0];
      const b = event.touches[1];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      this.pinchStartDist = Math.hypot(dx, dy);
      this.baseScale = this.zoomScale;
    } else if (event.touches.length === 1) {
      const t = event.touches[0];
      if (this.zoomScale > 1) {
        this.isDragging = true;
        this.dragStartX = t.clientX;
        this.dragStartY = t.clientY;
      } else {
        this.touchStartX = t.clientX;
        this.touchEndX = null;
      }
    }
  }

  onTouchMove(event: TouchEvent) {
    if (event.touches.length === 2 && this.pinchStartDist) {
      const a = event.touches[0];
      const b = event.touches[1];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      const dist = Math.hypot(dx, dy);
      let s = this.baseScale * (dist / this.pinchStartDist);
      s = Math.max(1, Math.min(4, s));
      this.zoomScale = s;
    } else if (event.touches.length === 1 && this.isDragging) {
      const t = event.touches[0];
      const dx = t.clientX - this.dragStartX;
      const dy = t.clientY - this.dragStartY;
      this.dragStartX = t.clientX;
      this.dragStartY = t.clientY;
      this.translateX += dx;
      this.translateY += dy;
    } else if (event.touches.length === 1) {
      this.touchEndX = event.touches[0].clientX;
    }
  }

  onTouchEnd() {
    this.pinchStartDist = null;
    this.isDragging = false;
    if (this.zoomScale === 1) {
      if (this.touchStartX === null || this.touchEndX === null) return;
      const deltaX = this.touchEndX - this.touchStartX;
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) {
          this.next();
        } else {
          this.prev();
        }
      }
      this.touchStartX = null;
      this.touchEndX = null;
    }
  }

  private preloadAround(index: number) {
    const toPreload = [index, (index + 1) % this.photos.length, (index - 1 + this.photos.length) % this.photos.length];
    toPreload.forEach(i => {
      const url = this.photos[i]?.url;
      if (!url) return;
      const img = new Image();
      img.src = url;
    });
  }

  private prepareImage(index: number) {
    this.imageLoading = true;
    this.resetTransform();
    const url = this.photos[index]?.url;
    if (!url) {
      this.imageLoading = false;
      return;
    }
    const img = new Image();
    img.src = url;
    img.decode?.().then(() => {
      this.imageLoading = false;
    }).catch(() => {
      this.imageLoading = false;
    });
  }

  onWheel(event: WheelEvent) {
    if (this.selectedIndex === null) return;
    event.preventDefault();
    const delta = -Math.sign(event.deltaY);
    let s = this.zoomScale + delta * 0.2;
    s = Math.max(1, Math.min(4, s));
    this.zoomScale = s;
  }

  onImageDblClick(event: MouseEvent) {
    if (this.selectedIndex === null) return;
    if (this.zoomScale === 1) {
      this.zoomScale = 2;
    } else {
      this.zoomScale = 1;
      this.resetTransform();
    }
  }

  onMouseDown(event: MouseEvent) {
    if (this.zoomScale <= 1) return;
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.translateX += dx;
    this.translateY += dy;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  rotate() {
    this.rotationDeg = (this.rotationDeg + 90) % 360;
  }

  get imageTransform(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.zoomScale}) rotate(${this.rotationDeg}deg)`;
  }

  private resetTransform() {
    this.zoomScale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.rotationDeg = 0;
    this.isDragging = false;
  }

  private getTs(url: string): number {
    const name = url.split('/').pop() || '';
    const tsStr = name.split('_')[0];
    const ts = Number(tsStr);
    return Number.isFinite(ts) ? ts : 0;
  }

  private sortUrlsDesc(urls: string[]): string[] {
    return [...urls].sort((a, b) => this.getTs(b) - this.getTs(a));
  }

  private sortEntriesDesc(entries: { url: string; alt: string }[]): { url: string; alt: string }[] {
    return [...entries].sort((a, b) => this.getTs(b.url) - this.getTs(a.url));
  }
}
