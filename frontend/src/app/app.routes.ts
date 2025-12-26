import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { LoginComponent } from './components/login/login';
import { GalleryComponent } from './components/gallery/gallery';
import { authGuard } from './services/auth-guard';
import { AlbumsComponent } from './components/albums/albums';
import { ShareComponent } from './components/share/share';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { 
        path: 'gallery/:albumId', 
        component: GalleryComponent,
        canActivate: [authGuard] 
    },
    { 
        path: 'gallery', 
        component: GalleryComponent,
        canActivate: [authGuard] 
    },
    {
        path: 'gallery/:albumId',
        component: GalleryComponent,
        canActivate: [authGuard]
    },
    { 
        path: 'albums',
        component: AlbumsComponent,
        canActivate: [authGuard]
    },
    { 
        path: 'share/:albumId/:shareId',
        component: ShareComponent
    },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: '**', redirectTo: '/home' }
];
