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
      },
      // Rutas para profesores
      {
        path: 'profesor/dashboard',
        loadComponent: () => import('./pages/profesor/dashboard-profesor/dashboard-profesor.component').then(m => m.DashboardProfesorComponent)
      },
      {
        path: 'profesor/cursos',
        loadComponent: () => import('./pages/profesor/cursos-profesor/cursos-profesor.component').then(m => m.CursosProfesorComponent)
      },
      {
        path: 'profesor/cursos/:id',
        loadComponent: () => import('./pages/profesor/curso-detalle-profesor/curso-detalle-profesor.component').then(m => m.CursoDetalleProfesorComponent)
      },
      {
        path: 'profesor/cursos/:courseId/estudiantes/:studentId',
        loadComponent: () => import('./pages/profesor/ficha-alumno/ficha-alumno.component').then(m => m.FichaAlumnoComponent)
      },
      {
        path: 'profesor/cursos/:courseId/tareas/:taskId',
        loadComponent: () => import('./pages/profesor/crear-tarea/crear-tarea.component').then(m => m.CrearTareaComponent)
      },
      {
        path: 'profesor/tareas',
        loadComponent: () => import('./pages/profesor/tareas-profesor/tareas-profesor.component').then(m => m.TareasProfesorComponent)
      },
      {
        path: 'profesor/notas',
        loadComponent: () => import('./pages/profesor/notas-profesor/notas-profesor.component').then(m => m.NotasProfesorComponent)
      },
      {
        path: 'profesor/asistencia',
        loadComponent: () => import('./pages/profesor/asistencia-profesor/asistencia-profesor.component').then(m => m.AsistenciaProfesorComponent)
      },
      {
        path: 'profesor/comunicados',
        loadComponent: () => import('./pages/profesor/comunicados-profesor/comunicados-profesor.component').then(m => m.ComunicadosProfesorComponent)
      },
      // Rutas para administradores
      {
        path: 'admin/dashboard',
        loadComponent: () => import('./pages/admin/dashboard-admin/dashboard-admin.component').then(m => m.DashboardAdminComponent)
      }
    ]
  }
];
