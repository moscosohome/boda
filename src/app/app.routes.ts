import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/wedding-home/wedding-home.component').then(
        (component) => component.WeddingHomeComponent,
      ),
  },
  {
    path: 'fotos',
    title: 'Comparte tus recuerdos | Cristina & Antonio',
    loadComponent: () =>
      import('./features/photos/photos.component').then((component) => component.PhotosComponent),
  },
  {
    path: 'admin-fotos',
    title: 'Fotos de la boda | Cristina & Antonio',
    loadComponent: () =>
      import('./features/photo-admin/photo-admin.component').then(
        (component) => component.PhotoAdminComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
