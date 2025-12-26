import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent {
  weddingTitle = 'Ikram et Mohamed';
  weddingDate = '20 décembre 2025';
  mode: 'login' | 'register' | 'reset' = 'login';
  email = '';
  password = '';
  name = '';
  loading = false;
  error = '';
  dropdownOpen = false;
  @ViewChild('menuRef') menuRef?: ElementRef<HTMLDivElement>;

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    this.error = '';
    this.loading = true;
    if (this.mode === 'login') {
      const res = await this.auth.loginWithEmail(this.email, this.password);
      this.loading = false;
      if (res.success) {
        this.router.navigate(['/albums']);
      } else {
        this.error = res.error || 'Échec de connexion';
      }
    } else if (this.mode === 'register') {
      const res = await this.auth.register(this.email, this.password, this.name);
      this.loading = false;
      if (res.success) {
        const loginRes = await this.auth.loginWithEmail(this.email, this.password);
        if (loginRes.success) {
          this.router.navigate(['/albums']);
        } else {
          this.error = loginRes.error || 'Échec de connexion';
        }
      } else {
        this.error = res.error || 'Échec de l’inscription';
      }
    } else {
      this.loading = false;
      this.error = 'Fonction de réinitialisation à implémenter côté backend';
    }
  }

  switchMode(next: 'login' | 'register' | 'reset') {
    this.mode = next;
    this.error = '';
  }

  openMenu(e: MouseEvent) {
    e.stopPropagation();
    if (this.dropdownOpen) {
      this.closeMenu();
      return;
    }
    const t = e.currentTarget as HTMLElement;
    this.dropdownOpen = true;
    setTimeout(() => {
      const el = this.menuRef?.nativeElement;
      const first = el?.querySelector('.menu-item') as HTMLElement | null;
      first?.focus();
    }, 0);
  }

  closeMenu() {
    this.dropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.dropdownOpen) return;
    const menuEl = this.menuRef?.nativeElement;
    const path = (ev.composedPath && ev.composedPath()) as EventTarget[] | undefined;
    if (menuEl) {
      if (path && path.includes(menuEl)) return;
      const target = ev.target as Node | null;
      if (target && menuEl.contains(target)) return;
    }
    this.closeMenu();
  }

  onMenuKeydown(ev: KeyboardEvent) {
    const items = Array.from(this.menuRef?.nativeElement?.querySelectorAll('.menu-item') || []);
    const idx = items.indexOf(document.activeElement as any);
    if (ev.key === 'ArrowDown') {
      const next = items[(idx + 1) % items.length] as HTMLElement;
      next?.focus();
      ev.preventDefault();
    } else if (ev.key === 'ArrowUp') {
      const prev = items[(idx - 1 + items.length) % items.length] as HTMLElement;
      prev?.focus();
      ev.preventDefault();
    } else if (ev.key === 'Escape') {
      this.closeMenu();
      ev.preventDefault();
    }
  }

  onTriggerKeydown(ev: KeyboardEvent) {
    const eRef = ev.currentTarget as HTMLElement;
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      const fakeMouse = { currentTarget: eRef, stopPropagation: () => {} } as unknown as MouseEvent;
      this.openMenu(fakeMouse);
    }
    if (ev.key === 'Escape') {
      this.closeMenu();
      ev.preventDefault();
    }
  }
}
