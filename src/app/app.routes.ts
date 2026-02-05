import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent)
      },
      {
        path: 'cursos',
        loadComponent: () => import('./pages/cursos/cursos.component').then(m => m.CursosComponent)
      },
      {
        path: 'cursos/:id',
        loadComponent: () => import('./pages/curso-detalle/curso-detalle.component').then(m => m.CursoDetalleComponent)
      },
      {
        path: 'tareas',
        loadComponent: () => import('./pages/tareas/tareas.component').then(m => m.TareasComponent)
      },
      {
        path: 'tareas/:id',
        loadComponent: () => import('./pages/tareas/tareas.component').then(m => m.TareasComponent)
      },
      {
        path: 'notas',
        loadComponent: () => import('./pages/notas/notas.component').then(m => m.NotasComponent)
      },
      {
        path: 'asistencia',
        loadComponent: () => import('./pages/asistencia/asistencia.component').then(m => m.AsistenciaComponent)
      },
      {
        path: 'comunicados',
        loadComponent: () => import('./pages/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
      }
    ]
  }
];
