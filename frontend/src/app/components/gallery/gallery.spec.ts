import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GalleryComponent } from './gallery';

describe('Gallery', () => {
  let component: GalleryComponent;
  let fixture: ComponentFixture<GalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens lightbox and shows correct index', () => {
    component.photos = [
      { url: 'u1', alt: 'a1' },
      { url: 'u2', alt: 'a2' },
      { url: 'u3', alt: 'a3' }
    ];
    component.openLightbox(1);
    expect(component.selectedIndex).toBe(1);
  });

  it('navigates next and wraps', () => {
    component.photos = [
      { url: 'u1', alt: 'a1' },
      { url: 'u2', alt: 'a2' }
    ];
    component.openLightbox(1);
    component.next();
    expect(component.selectedIndex).toBe(0);
  });

  it('navigates prev and wraps', () => {
    component.photos = [
      { url: 'u1', alt: 'a1' },
      { url: 'u2', alt: 'a2' }
    ];
    component.openLightbox(0);
    component.prev();
    expect(component.selectedIndex).toBe(1);
  });

  it('keyboard navigation works', () => {
    component.photos = [
      { url: 'u1', alt: 'a1' },
      { url: 'u2', alt: 'a2' }
    ];
    component.openLightbox(0);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(component.selectedIndex).toBe(1);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.selectedIndex).toBe(0);
  });

  it('escape closes lightbox', () => {
    component.photos = [{ url: 'u1', alt: 'a1' }];
    component.openLightbox(0);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.selectedIndex).toBeNull();
  });
});
