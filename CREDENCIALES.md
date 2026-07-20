# Credenciales de Acceso - Portal SML

Cuentas de ejemplo creadas por el seed del backend (`smlbaackend`).

## Cuentas disponibles

### 1. Administrador
- **Usuario:** `admin`
- **Contraseña:** `Admin123!`
- **Rol:** Administrador
- **Redirección:** `/admin/dashboard`

### 2. Profesor
- **Usuario:** `profesor`
- **Contraseña:** `Teacher123!`
- **Rol:** Profesor
- **Redirección:** `/profesor/dashboard`

### 3. Estudiante
- **Usuario:** `estudiante`
- **Contraseña:** `Student123!`
- **Rol:** Estudiante
- **Redirección:** `/dashboard`

### 4. Padre de Familia
- **Usuario:** `padre`
- **Contraseña:** `Parent123!`
- **Rol:** Padre de Familia
- **Redirección:** `/padre/dashboard`

## Notas

- También puedes iniciar sesión con el correo (`admin@colegio.edu.pe`, etc.) y la misma contraseña.
- Para restablecer estas contraseñas a los valores de arriba, ejecuta en el backend:

```bash
cd smlbaackend
npm run prisma:seed
```

- El seed actualiza el `passwordHash` de los usuarios demo aunque ya existan.
- La sesión se guarda en `localStorage` si marcas "Recordarme", o en `sessionStorage` si no.

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
