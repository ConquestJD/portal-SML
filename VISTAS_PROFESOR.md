# Vistas del Profesor - Portal SML

## Resumen de Vistas Implementadas

### ✅ Vistas Completadas

#### 1. **Dashboard Profesor** (`/profesor/dashboard`)
- **Objetivo**: Resumen del día/semana con métricas clave
- **Funcionalidades**:
  - Resumen de cursos a cargo
  - Tareas por calificar
  - Asistencias pendientes
  - Total de estudiantes
  - Accesos rápidos a secciones principales
  - Actividad reciente
  - Alertas y notificaciones

#### 2. **Mis Cursos** (`/profesor/cursos`)
- **Objetivo**: Lista de cursos dictados por el profesor
- **Funcionalidades**:
  - Vista de cuadrícula y lista
  - Búsqueda de cursos
  - Filtros por período académico
  - Métricas por curso (estudiantes, pendientes, promedio)
  - Acceso rápido al detalle de cada curso

#### 3. **Detalle de Curso** (`/profesor/cursos/:id`)
- **Objetivo**: Gestión completa de un curso específico
- **Funcionalidades**:
  - **Pestaña Estudiantes**: Lista con búsqueda, ver ficha, exportar
  - **Pestaña Tareas**: Listado de tareas, crear nueva, editar, revisar entregas
  - **Pestaña Notas**: Gestión de calificaciones y evaluaciones
  - **Pestaña Asistencia**: Registro y gestión de asistencia
  - **Pestaña Material**: Gestión de materiales del curso
  - **Pestaña Comunicados**: Comunicados del curso
  - **Pestaña Mensajes**: Mensajería del curso

#### 4. **Ficha del Alumno** (`/profesor/cursos/:courseId/estudiantes/:studentId`)
- **Objetivo**: Vista detallada del rendimiento académico de un estudiante en el curso
- **Funcionalidades**:
  - Resumen académico (promedio, tareas, asistencia)
  - Lista de tareas con estado y calificaciones
  - Evaluaciones y notas
  - Historial de asistencia
  - Observaciones del profesor
  - Información de contacto (estudiante y tutor)

#### 5. **Crear/Editar Tarea** (`/profesor/cursos/:courseId/tareas/:taskId`)
- **Objetivo**: Formulario para crear o editar tareas
- **Funcionalidades**:
  - Información básica (título, descripción, instrucciones)
  - Configuración de entrega (fecha límite, tipo de entrega)
  - Permitir entregas tardías
  - Rúbrica y criterios de evaluación
  - Archivos adjuntos
  - Modo edición para tareas existentes

### 🔄 Vistas en Desarrollo (Estructura Creada)

#### 6. **Revisión de Entregas** (Pendiente)
- **Objetivo**: Bandeja de entregas por tarea
- **Funcionalidades Planificadas**:
  - Ver todas las entregas de una tarea
  - Comentarios y feedback
  - Devolver para corrección
  - Marcar como revisado
  - Filtros por estado

#### 7. **Calificar Tarea / Rúbrica** (Pendiente)
- **Objetivo**: Vista de calificación individual
- **Funcionalidades Planificadas**:
  - Puntaje y rúbrica
  - Feedback detallado
  - Historial de cambios
  - Publicar nota

#### 8. **Gestión de Materiales** (Pendiente)
- **Objetivo**: Listado y organización de materiales
- **Funcionalidades Planificadas**:
  - Subir/editar/eliminar material
  - Organizar por semanas/unidades
  - Adjuntar links
  - Control de visibilidad (publicado/borrador)

#### 9. **Crear/Editar Material** (Pendiente)
- **Objetivo**: Formulario para materiales
- **Funcionalidades Planificadas**:
  - Título, descripción, archivo/link
  - Fecha de publicación
  - Visibilidad por sección

#### 10. **Gestión de Evaluaciones** (Pendiente)
- **Objetivo**: Crear y gestionar evaluaciones
- **Funcionalidades Planificadas**:
  - Crear evaluaciones (examen, práctica, participación)
  - Ponderaciones
  - Fechas y publicación

#### 11. **Registro de Notas (Libro de Notas)** (Pendiente)
- **Objetivo**: Tabla de calificaciones
- **Funcionalidades Planificadas**:
  - Tabla por alumnos vs evaluaciones/tareas
  - Edición rápida
  - Cálculo de promedios
  - Publicación/ocultar notas

#### 12. **Asistencia del Curso (Registro Diario)** (Pendiente)
- **Objetivo**: Marcar asistencia diaria
- **Funcionalidades Planificadas**:
  - Marcar presente/tarde/falta
  - Observaciones
  - Guardar y editar con límite de tiempo

#### 13. **Historial de Asistencia** (Pendiente)
- **Objetivo**: Reportes de asistencia
- **Funcionalidades Planificadas**:
  - Reporte por alumno y por fechas
  - Exportación
  - Resumen mensual

#### 14. **Comunicados del Curso** (Pendiente)
- **Objetivo**: Gestión de comunicados
- **Funcionalidades Planificadas**:
  - Crear/editar comunicados
  - Adjuntar archivos
  - Programar publicación

#### 15. **Mensajería** (Pendiente)
- **Objetivo**: Comunicación con estudiantes y tutores
- **Funcionalidades Planificadas**:
  - Inbox de mensajes
  - Filtros por curso
  - Plantillas rápidas
  - Control de permisos

#### 16. **Mi Perfil (Profesor)** (Pendiente)
- **Objetivo**: Perfil del profesor
- **Funcionalidades Planificadas**:
  - Datos personales
  - Cursos a cargo
  - Firma/plantilla de mensajes

## Estructura de Navegación

```
Dashboard Profesor
  ├─→ Mis Cursos
  │    └─→ Detalle de Curso
  │         ├─→ Estudiantes
  │         │    └─→ Ficha del Alumno
  │         ├─→ Tareas
  │         │    ├─→ Crear/Editar Tarea
  │         │    ├─→ Revisión de Entregas
  │         │    └─→ Calificar Tarea
  │         ├─→ Notas (Libro de Notas)
  │         ├─→ Asistencia
  │         │    └─→ Historial de Asistencia
  │         ├─→ Material
  │         │    └─→ Crear/Editar Material
  │         ├─→ Comunicados
  │         └─→ Mensajes
  ├─→ Mi Perfil
  └─→ Configuración
```

## Características Técnicas

- **Framework**: Angular con Signals
- **Estilos**: CSS con variables institucionales (azul #003366, rojo #C41E3A)
- **Iconos**: Font Awesome
- **Responsive**: Diseño adaptable a móviles y tablets
- **Navegación**: Breadcrumbs y tabs para mejor UX

## Próximos Pasos

1. Completar las vistas pendientes
2. Implementar funcionalidad de backend (cuando esté disponible)
3. Agregar validaciones de formularios
4. Implementar guards de autenticación por rol
5. Agregar notificaciones en tiempo real
