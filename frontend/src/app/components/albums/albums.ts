import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlbumsService } from '../../services/albums.service';
import { AuthService } from '../../services/auth';
import { GalleryService } from '../../services/gallery.service';
import { Router } from '@angular/router';
import { ReturnComponent } from '../return/return.component';

@Component({
  selector: 'app-albums',
  standalone: true,
  imports: [CommonModule, FormsModule, ReturnComponent],
  templateUrl: './albums.html',
  styleUrls: ['./albums.scss']
})
export class AlbumsComponent implements OnInit {
  albums: any[] = [];
  newTitle = '';
  loading = false;
  error = '';
  modalOpen = false;
  modalTitle = '';
  titleInvalid = false;
  coverFile: File | null = null;
  coverPreview: string | null = null;
  coverError = '';
  photosFiles: File[] = [];
  photosCount = 0;
  photosError = '';
  photosPreviews: { file: File; url: string }[] = [];
  uploadProgress = 0;
  loadingSubmit = false;
  submitSuccess = '';
  submitError = '';
  shareMessage = '';
  shareModalOpen = false;
  shareTitle = '';
  shareText = '';
  shareUrlText = '';
  sharePreviewUrl: string | null = null;

  constructor(private albumsService: AlbumsService, private auth: AuthService, private gallery: GalleryService, private router: Router) {}

  ngOnInit(): void {
    this.fetch();
  }

  async fetch() {
    this.loading = true;
    this.error = '';
    try {
      this.albums = await this.albumsService.mine();
    } catch (e: any) {
      this.error = e?.message || 'Erreur de chargement';
    } finally {
      this.loading = false;
    }
  }

  async create() {
    if (!this.newTitle.trim()) return;
    this.loading = true;
    this.error = '';
    try {
      await this.albumsService.create(this.newTitle);
      this.newTitle = '';
      await this.fetch();
    } catch (e: any) {
      this.error = e?.message || 'Erreur de création';
    } finally {
      this.loading = false;
    }
  }

  async remove(a: any) {
    this.loading = true;
    this.error = '';
    try {
      await this.albumsService.remove(a._id);
      await this.fetch();
    } catch (e: any) {
      this.error = e?.message || 'Erreur de suppression';
    } finally {
      this.loading = false;
    }
  }

  openCreateModal() {
    this.modalOpen = true;
    this.modalTitle = this.newTitle || '';
    this.titleInvalid = false;
    this.coverFile = null;
    this.coverPreview = null;
    this.coverError = '';
    this.photosFiles = [];
    this.photosCount = 0;
    this.photosError = '';
    this.photosPreviews.forEach(p => URL.revokeObjectURL(p.url));
    this.photosPreviews = [];
    this.uploadProgress = 0;
    this.loadingSubmit = false;
    this.submitSuccess = '';
    this.submitError = '';
  }

  closeModal() {
    this.modalOpen = false;
    this.photosPreviews.forEach(p => URL.revokeObjectURL(p.url));
    this.photosPreviews = [];
  }

  onCoverSelected(event: Event) {
    this.coverError = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) { this.coverFile = null; this.coverPreview = null; return; }
    const valid = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
    const sizeOk = file.size <= 5 * 1024 * 1024;
    if (!valid) { this.coverError = 'Format non pris en charge'; this.coverFile = null; this.coverPreview = null; return; }
    if (!sizeOk) { this.coverError = 'Fichier trop volumineux (max 5MB)'; this.coverFile = null; this.coverPreview = null; return; }
    this.coverFile = file;
    this.coverPreview = URL.createObjectURL(file);
  }

  onPhotosSelected(event: Event) {
    this.photosError = '';
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const filtered = files.filter(f => validTypes.includes(f.type) && f.size <= 5 * 1024 * 1024);
    const remaining = Math.max(0, 50 - this.photosPreviews.length);
    const toAdd = filtered.slice(0, remaining);
    if (filtered.length > remaining) {
      this.photosError = 'Limite de 50 photos';
    }
    const previews = toAdd.map(file => ({ file, url: URL.createObjectURL(file) }));
    this.photosPreviews = [...this.photosPreviews, ...previews];
    this.photosFiles = this.photosPreviews.map(p => p.file);
    this.photosCount = this.photosFiles.length;
    if (files.length !== filtered.length) {
      this.photosError = this.photosError || 'Certains fichiers ont été ignorés (format/poids)';
    }
  }

  async submitModal() {
    this.titleInvalid = !this.modalTitle.trim();
    if (this.titleInvalid) return;
    this.loadingSubmit = true;
    this.submitError = '';
    this.submitSuccess = '';
    try {
      const album = await this.albumsService.create(this.modalTitle.trim());
      let coverUrl: string | null = null;
      let photoUrls: string[] = [];
      if (this.coverFile || this.photosFiles.length) {
        const formData = new FormData();
        if (this.coverFile) formData.append('photos', this.coverFile);
        this.photosFiles.forEach(f => formData.append('photos', f));
        if (album?._id) formData.append('albumId', album._id);
        formData.append('coverIndex', this.coverFile ? '0' : '-1');
        const sub = this.gallery.uploadPhotos(formData).subscribe({
          next: (event: any) => {
            if (event.type && event.type === 1 && event.total) {
              this.uploadProgress = Math.round(100 * event.loaded / event.total);
            }
            if (event.body?.uploaded) {
              const urls: string[] = event.body.uploaded;
              if (this.coverFile) {
                coverUrl = urls[0] || null;
                photoUrls = urls.slice(1);
              } else {
                photoUrls = urls;
              }
            }
          },
          error: (err: any) => {
            this.submitError = err?.error?.message || 'Échec de l’upload';
          },
          complete: async () => {
            this.saveAlbumMedia(album?._id, coverUrl, photoUrls);
            this.submitSuccess = 'Album créé';
            this.newTitle = '';
            await this.fetch();
            this.loadingSubmit = false;
            this.closeModal();
            this.photosPreviews.forEach(p => URL.revokeObjectURL(p.url));
            this.photosPreviews = [];
          }
        });
      } else {
        this.submitSuccess = 'Album créé';
        this.newTitle = '';
        await this.fetch();
        this.loadingSubmit = false;
        this.closeModal();
        this.photosPreviews.forEach(p => URL.revokeObjectURL(p.url));
        this.photosPreviews = [];
      }
    } catch (e: any) {
      this.submitError = e?.message || 'Erreur de création';
      this.loadingSubmit = false;
    }
  }

  private saveAlbumMedia(id: string, coverUrl: string | null, photoUrls: string[]) {
    try {
      const raw = localStorage.getItem('albumMedia');
      const map = raw ? JSON.parse(raw) : {};
      map[id] = { coverUrl, photoUrls };
      localStorage.setItem('albumMedia', JSON.stringify(map));
    } catch {}
  }

  getCoverUrl(id: string): string | null {
    try {
      const raw = localStorage.getItem('albumMedia');
      const map = raw ? JSON.parse(raw) : {};
      return map?.[id]?.coverUrl || null;
    } catch {
      return null;
    }
  }

  removePhoto(index: number) {
    const p = this.photosPreviews[index];
    if (p) URL.revokeObjectURL(p.url);
    this.photosPreviews.splice(index, 1);
    this.photosFiles = this.photosPreviews.map(v => v.file);
    this.photosCount = this.photosFiles.length;
  }

  openAlbumGallery(a: any) {
    this.router.navigate(['/gallery', a._id]);
  }

  shareUrl(a: any): string {
    const origin = window.location.origin;
    const shareId = a?.shareId || '';
    if (!a?._id || !shareId) return '';
    return `${origin}/share/${a._id}/${shareId}`;
  }

  async shareAlbum(a: any) {
    let url = this.shareUrl(a);
    if (!url) {
      try {
        const ensured = await this.albumsService.ensureShareLink(a._id);
        a.shareId = ensured.shareId;
        url = this.shareUrl(a);
      } catch (e) {
        this.shareMessage = 'Lien de partage indisponible';
        setTimeout(() => this.shareMessage = '', 2500);
        return;
      }
    }
    this.shareTitle = `Album: ${a?.title || 'Sans titre'}`;
    this.shareText = 'Découvrez les photos de notre album';
    this.shareUrlText = url;
    this.sharePreviewUrl = this.getCoverUrl(a?._id);
    const hasNative = !!(navigator as any).share;
    if (hasNative) {
      try {
        const payload: any = { title: this.shareTitle, text: this.shareText, url };
        // Tentative d’ajout d’image si supporté
        if (this.sharePreviewUrl && (navigator as any).canShare && typeof (navigator as any).canShare === 'function') {
          try {
            const resp = await fetch(this.sharePreviewUrl);
            const blob = await resp.blob();
            const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' });
            if ((navigator as any).canShare({ files: [file] })) {
              payload.files = [file];
            }
          } catch {}
        }
        await (navigator as any).share(payload);
        this.shareMessage = 'Partage réussi';
        await this.albumsService.trackShare(a._id, 'native', true);
        setTimeout(() => this.shareMessage = '', 2500);
        return;
      } catch (e) {
        await this.albumsService.trackShare(a._id, 'native', false, { error: String(e) });
      }
    }
    this.openShareModal();
  }

  openShareModal() {
    this.shareModalOpen = true;
  }

  closeShareModal() {
    this.shareModalOpen = false;
  }

  async copyShareLink() {
    try {
      await navigator.clipboard.writeText(this.shareUrlText);
      this.shareMessage = 'Lien de partage copié';
    } catch {
      const tmp = document.createElement('input');
      tmp.value = this.shareUrlText;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      this.shareMessage = 'Lien de partage copié';
    }
    setTimeout(() => this.shareMessage = '', 2500);
  }

  async shareVia(channel: 'whatsapp' | 'messenger' | 'facebook' | 'twitter' | 'sms' | 'email') {
    const textEncoded = encodeURIComponent(`${this.shareTitle}\n${this.shareText}\n${this.shareUrlText}`);
    const urlEncoded = encodeURIComponent(this.shareUrlText);
    let href = '';
    switch (channel) {
      case 'whatsapp':
        href = `https://wa.me/?text=${textEncoded}`;
        break;
      case 'messenger':
        href = `https://www.facebook.com/dialog/send?app_id=6628568379&link=${urlEncoded}&redirect_uri=${urlEncoded}`;
        break;
      case 'facebook':
        href = `https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`;
        break;
      case 'twitter':
        href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareTitle)}&url=${urlEncoded}`;
        break;
      case 'sms':
        href = `sms:?body=${textEncoded}`;
        break;
      case 'email':
        href = `mailto:?subject=${encodeURIComponent(this.shareTitle)}&body=${textEncoded}`;
        break;
    }
    const w = window.open(href, '_blank', 'noopener');
    await this.albumsService.trackShare(
      this.albums.find(x => this.shareUrlText.includes(x._id))?._id || '',
      channel,
      !!w
    );
  }
}
