import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
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
        loadComponent: () => import('./pages/tareas/tarea-detalle/tarea-detalle.component').then(m => m.TareaDetalleComponent)
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
        path: 'comunicados/:id',
        loadComponent: () => import('./pages/comunicados/comunicado-detalle/comunicado-detalle.component').then(m => m.ComunicadoDetalleComponent)
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
        path: 'profesor/cursos/:courseId/tareas/:taskId/revisar',
        loadComponent: () => import('./pages/profesor/revisar-tarea/revisar-tarea.component').then(m => m.RevisarTareaComponent)
      },
      {
        path: 'profesor/cursos/:courseId/asistencia/marcar',
        loadComponent: () => import('./pages/profesor/marcar-asistencia/marcar-asistencia.component').then(m => m.MarcarAsistenciaComponent)
      },
      {
        path: 'profesor/cursos/:courseId/materiales/:materialId',
        loadComponent: () => import('./pages/profesor/subir-material/subir-material.component').then(m => m.SubirMaterialComponent)
      },
      {
        path: 'profesor/cursos/:courseId/comunicados/:comunicadoId',
        loadComponent: () => import('./pages/profesor/crear-comunicado/crear-comunicado.component').then(m => m.CrearComunicadoComponent)
      },
      {
        path: 'profesor/perfil',
        loadComponent: () => import('./pages/profesor/perfil-profesor/perfil-profesor.component').then(m => m.PerfilProfesorComponent)
      },
      {
        path: 'profesor/configuracion',
        loadComponent: () => import('./pages/profesor/configuracion-profesor/configuracion-profesor.component').then(m => m.ConfiguracionProfesorComponent)
      },
      {
        path: 'profesor/cursos/:courseId/mensajeria',
        loadComponent: () => import('./pages/mensajeria-curso/mensajeria-curso.component').then(m => m.MensajeriaCursoComponent)
      },
      {
        path: 'cursos/:id/mensajeria',
        loadComponent: () => import('./pages/mensajeria-curso/mensajeria-curso.component').then(m => m.MensajeriaCursoComponent)
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
      },
      {
        path: 'admin/usuarios',
        loadComponent: () => import('./pages/admin/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'admin/usuarios/crear',
        loadComponent: () => import('./pages/admin/crear-usuario/crear-usuario.component').then(m => m.CrearUsuarioComponent)
      },
      {
        path: 'admin/usuarios/:id/editar',
        loadComponent: () => import('./pages/admin/crear-usuario/crear-usuario.component').then(m => m.CrearUsuarioComponent)
      },
      {
        path: 'admin/estudiantes',
        loadComponent: () => import('./pages/admin/estudiantes/estudiantes.component').then(m => m.EstudiantesComponent)
      },
      {
        path: 'admin/estudiantes/:id',
        loadComponent: () => import('./pages/admin/detalle-estudiante/detalle-estudiante.component').then(m => m.DetalleEstudianteComponent)
      },
      {
        path: 'admin/profesores',
        loadComponent: () => import('./pages/admin/profesores/profesores.component').then(m => m.ProfesoresComponent)
      },
      {
        path: 'admin/profesores/:id',
        loadComponent: () => import('./pages/admin/detalle-profesor/detalle-profesor.component').then(m => m.DetalleProfesorComponent)
      },
      {
        path: 'admin/cursos',
        loadComponent: () => import('./pages/admin/cursos-admin/cursos-admin.component').then(m => m.CursosAdminComponent)
      },
      {
        path: 'admin/anio-academico',
        loadComponent: () => import('./pages/admin/anio-academico/anio-academico.component').then(m => m.AnioAcademicoComponent)
      },
      {
        path: 'admin/grados-secciones',
        loadComponent: () => import('./pages/admin/grados-secciones/grados-secciones.component').then(m => m.GradosSeccionesComponent)
      },
      {
        path: 'admin/matricula',
        loadComponent: () => import('./pages/admin/matricula/matricula.component').then(m => m.MatriculaComponent)
      },
      {
        path: 'admin/asignacion-docente',
        loadComponent: () => import('./pages/admin/asignacion-docente/asignacion-docente.component').then(m => m.AsignacionDocenteComponent)
      },
      {
        path: 'admin/comunicados',
        loadComponent: () => import('./pages/admin/comunicados-admin/comunicados-admin.component').then(m => m.ComunicadosAdminComponent)
      },
      {
        path: 'admin/roles-permisos',
        loadComponent: () => import('./pages/admin/roles-permisos/roles-permisos.component').then(m => m.RolesPermisosComponent)
      },
      {
        path: 'admin/reportes',
        loadComponent: () => import('./pages/admin/reportes/reportes.component').then(m => m.ReportesComponent)
      },
      {
        path: 'admin/configuracion',
        loadComponent: () => import('./pages/admin/configuracion-admin/configuracion-admin.component').then(m => m.ConfiguracionAdminComponent)
      },
      {
        path: 'admin/perfil',
        loadComponent: () => import('./pages/admin/perfil-admin/perfil-admin.component').then(m => m.PerfilAdminComponent)
      },
      // Rutas para padres de familia
      {
        path: 'padre/dashboard',
        loadComponent: () => import('./pages/padre/dashboard-padre/dashboard-padre.component').then(m => m.DashboardPadreComponent)
      },
      {
        path: 'padre/perfil-hijo',
        loadComponent: () => import('./pages/padre/perfil-hijo/perfil-hijo.component').then(m => m.PerfilHijoComponent)
      },
      {
        path: 'padre/cursos',
        loadComponent: () => import('./pages/padre/cursos-padre/cursos-padre.component').then(m => m.CursosPadreComponent)
      },
      {
        path: 'padre/cursos/:id',
        loadComponent: () => import('./pages/padre/curso-detalle-padre/curso-detalle-padre.component').then(m => m.CursoDetallePadreComponent)
      },
      {
        path: 'padre/tareas',
        loadComponent: () => import('./pages/padre/tareas-padre/tareas-padre.component').then(m => m.TareasPadreComponent)
      },
      {
        path: 'padre/notas',
        loadComponent: () => import('./pages/padre/notas-padre/notas-padre.component').then(m => m.NotasPadreComponent)
      },
      {
        path: 'padre/asistencia',
        loadComponent: () => import('./pages/padre/asistencia-padre/asistencia-padre.component').then(m => m.AsistenciaPadreComponent)
      },
      {
        path: 'padre/justificaciones',
        loadComponent: () => import('./pages/padre/justificaciones/justificaciones.component').then(m => m.JustificacionesComponent)
      },
      {
        path: 'padre/comunicados',
        loadComponent: () => import('./pages/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      },
      {
        path: 'padre/mensajeria',
        loadComponent: () => import('./pages/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      },
      {
        path: 'padre/pagos',
        loadComponent: () => import('./pages/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      },
      {
        path: 'padre/documentos',
        loadComponent: () => import('./pages/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      }
    ]
  }
];
