# Credenciales de Acceso - Portal SML

Este documento contiene las credenciales de las cuentas de ejemplo para acceder al portal.

## Cuentas Disponibles

### 1. Estudiante (Alumno)
- **Usuario:** `alumno`
- **Contraseña:** `alumno123`
- **Rol:** Estudiante
- **Redirección:** `/dashboard`

### 2. Profesor
- **Usuario:** `profesor`
- **Contraseña:** `profesor123`
- **Rol:** Profesor
- **Redirección:** `/profesor/dashboard`

### 3. Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Rol:** Administrador
- **Redirección:** `/admin/dashboard`

## Notas

- Las credenciales son de ejemplo y están almacenadas en el servicio de autenticación.
- En producción, estas credenciales deben ser reemplazadas por un sistema de autenticación real con base de datos.
- El sistema mantiene la sesión en `localStorage` si se selecciona "Recordarme", o en `sessionStorage` si no.

## Funcionalidades por Rol

### Estudiante
- Ver sus cursos
- Ver y entregar tareas
- Ver notas y calificaciones
- Ver asistencia
- Ver comunicados
- Gestionar perfil y configuración

### Profesor
- Ver cursos que imparte
- Gestionar estudiantes de sus cursos
- Crear y calificar tareas
- Registrar calificaciones
- Marcar asistencia
- Ver comunicados

### Administrador
- Gestionar estudiantes
- Gestionar profesores
- Gestionar cursos
- Revisar solicitudes
- Ver reportes
- Configuración del sistema
