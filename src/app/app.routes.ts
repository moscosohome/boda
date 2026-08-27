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
    path: '**',
    redirectTo: '',
  },
];
