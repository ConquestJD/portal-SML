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

### 4. Padre de Familia
- **Usuario:** `padre`
- **Contraseña:** `padre123`
- **Rol:** Padre de Familia
- **Redirección:** `/padre/dashboard`

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

### Padre de Familia
- Ver información de sus hijos
- Ver cursos de los hijos
- Ver tareas y actividades
- Ver notas y boletas
- Ver asistencia
- Justificar faltas/tardanzas
- Ver comunicados institucionales y del tutor
- Mensajería con el colegio
- Solicitar reuniones
- Ver pagos y estado de cuenta
- Acceder a documentos
