# Guía de integración Frontend — Portal SML

**Base URL:** `http://localhost:3000/api/v1`  
**Swagger interactivo:** `http://localhost:3000/api/docs`

---

## Índice

1. [Convenciones generales](#1-convenciones-generales)
2. [Autenticación y sesión](#2-autenticación-y-sesión)
3. [Manejo de errores](#3-manejo-de-errores)
4. [Paginación y filtros](#4-paginación-y-filtros)
5. [Subida de archivos](#5-subida-de-archivos)
6. [Descarga de archivos](#6-descarga-de-archivos)
7. [Módulo Auth](#7-módulo-auth)
8. [Módulo Users (ADMIN)](#8-módulo-users-admin)
9. [Módulo Students (ADMIN)](#9-módulo-students-admin)
10. [Módulo Parents (ADMIN)](#10-módulo-parents-admin)
11. [Módulo Teachers (ADMIN)](#11-módulo-teachers-admin)
12. [Módulo Courses (ADMIN)](#12-módulo-courses-admin)
13. [Módulo Sections (ADMIN)](#13-módulo-sections-admin)
14. [Módulo Academic Years (ADMIN)](#14-módulo-academic-years-admin)
15. [Módulo Enrollments (ADMIN)](#15-módulo-enrollments-admin)
16. [Módulo Teacher Assignments (ADMIN)](#16-módulo-teacher-assignments-admin)
17. [Módulo Roles (ADMIN)](#17-módulo-roles-admin)
18. [Módulo Reports (ADMIN)](#18-módulo-reports-admin)
19. [Módulo Announcements (todos los roles)](#19-módulo-announcements)
20. [Portal del Profesor](#20-portal-del-profesor)
21. [Portal del Estudiante](#21-portal-del-estudiante)
22. [Portal del Padre](#22-portal-del-padre)
23. [Módulo Messaging](#23-módulo-messaging)
24. [Módulo Dashboards](#24-módulo-dashboards)
25. [Guía por rol (resumen de rutas)](#25-guía-por-rol)
26. [Ejemplo de cliente HTTP (TypeScript)](#26-ejemplo-de-cliente-http-typescript)

---

## 1. Convenciones generales

### URL base

```
http://localhost:3000/api/v1
```

Todas las rutas usan el prefijo `/api/v1`. Ejemplo completo:

```
POST http://localhost:3000/api/v1/auth/login
```

### Headers obligatorios

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` (excepto en multipart) |
| `Authorization` | `Bearer <accessToken>` (en rutas protegidas) |

### Estructura de respuesta exitosa

```json
{
  "success": true,
  "data": { ... }
}
```

Con paginación:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

---

## 2. Autenticación y sesión

### Flujo completo

```
LOGIN ──► accessToken (15 min) + refreshToken (7 días)
           │
           ▼ (en cada request)
    Authorization: Bearer <accessToken>
           │
           ▼ (cuando el accessToken expira → 401)
    POST /auth/refresh-token { refreshToken }
           │
           ▼ nuevo accessToken + refreshToken
```

### Almacenamiento recomendado

| Token | Dónde guardar |
|---|---|
| `accessToken` | Memoria (variable de estado / Zustand / Redux) |
| `refreshToken` | `httpOnly cookie` o `localStorage` (según tu política de seguridad) |

> **Nunca** guardes el `accessToken` en `localStorage` si quieres proteger contra XSS. Guárdalo en memoria y el `refreshToken` en `httpOnly cookie`.

### Interceptor de renovación automática (pseudocódigo)

```typescript
// En tu cliente HTTP (axios / fetch wrapper)
async function request(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${getAccessToken()}`, ...options.headers }
  });

  if (response.status === 401) {
    // Intentar renovar
    const refreshed = await fetch('/api/v1/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: getRefreshToken() })
    });

    if (refreshed.ok) {
      const { data } = await refreshed.json();
      saveTokens(data.accessToken, data.refreshToken);
      // Reintentar la petición original con el nuevo token
      response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${data.accessToken}`, ...options.headers }
      });
    } else {
      // Refresh también falló → redirigir al login
      redirectToLogin();
    }
  }

  return response;
}
```

---

## 3. Manejo de errores

### Estructura de error

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "details": [ ... ]   // solo en errores de validación
  },
  "path": "/api/v1/auth/login",
  "timestamp": "2026-03-07T20:00:00.000Z"
}
```

### Códigos HTTP más frecuentes

| Código | Significado | Qué hacer en el frontend |
|---|---|---|
| `200` | OK | Procesar `data` |
| `201` | Created | Recurso creado, procesar `data` |
| `400` | Bad Request / validación | Mostrar `error.details` en el formulario |
| `401` | Unauthorized | Intentar refresh → si falla, ir al login |
| `403` | Forbidden (rol incorrecto) | Mostrar mensaje de acceso denegado |
| `404` | Not Found | Mostrar pantalla 404 o mensaje |
| `409` | Conflict (ej. email duplicado) | Mostrar `error.message` en campo |
| `429` | Too Many Requests | Esperar y reintentar (rate limit) |
| `500` | Error interno | Mostrar mensaje genérico |

### Errores de validación (400)

Cuando un DTO falla validación, `details` tiene el siguiente formato:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Bad Request",
    "details": [
      "email must be an email",
      "password must be longer than or equal to 8 characters"
    ]
  }
}
```

---

## 4. Paginación y filtros

### Query params estándar

```
GET /api/v1/students?page=2&pageSize=10&search=ana&status=ACTIVE
```

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | `1` | Página actual |
| `pageSize` | number | `20` | Registros por página (máx 100) |
| `search` | string | — | Búsqueda en nombre/email |

### Respuesta paginada

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 2,
    "pageSize": 10,
    "total": 87,
    "totalPages": 9
  }
}
```

---

## 5. Subida de archivos

Los endpoints que aceptan archivos usan `multipart/form-data`. El campo del archivo siempre se llama `files` (múltiple) o `photo` (foto de perfil).

```typescript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
// Datos adicionales del formulario:
formData.append('title', 'Mi tarea');
formData.append('description', 'Descripción');

const response = await fetch('/api/v1/teacher/courses/:courseId/tasks', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  // NO incluir Content-Type manual — el browser lo añade con el boundary
  body: formData
});
```

> **Importante:** No establezcas `Content-Type: multipart/form-data` manualmente. El browser (o tu cliente HTTP) lo hace automáticamente con el `boundary` correcto.

### Límites de tamaño

| Endpoint | Límite |
|---|---|
| Tareas / materiales del profesor | 50 MB por archivo |
| Documentos de estudiante | 20 MB por archivo |
| Entregas de tareas | 50 MB |
| Justificaciones | 10 MB |
| Adjuntos comunicados | 20 MB |
| Foto de perfil | 50 MB |

---

## 6. Descarga de archivos

Los endpoints de descarga responden con un **redirect HTTP 307** a una URL firmada de Cloudflare R2 con validez de 1 hora.

```typescript
// Opción A: abrir en nueva pestaña
window.open(`/api/v1/students/${id}/documents/${docId}/download`);

// Opción B: fetch con redirect follow y crear blob
const response = await fetch(downloadUrl, {
  headers: { Authorization: `Bearer ${accessToken}` },
  redirect: 'follow'   // axios lo hace automáticamente
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'archivo.pdf';
a.click();
```

---

## 7. Módulo Auth

### POST `/auth/login`

> Pública (no requiere token)  
> Rate limit: 10 intentos / minuto

**Request:**
```json
{
  "email": "admin@colegio.edu.pe",
  "password": "Admin123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clxyz123",
      "email": "admin@colegio.edu.pe",
      "firstName": "Admin",
      "lastName": "SML",
      "role": { "name": "ADMIN" },
      "status": "ACTIVE",
      "avatarUrl": null
    }
  }
}
```

---

### GET `/auth/me`

> Requiere token

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clxyz123",
    "email": "admin@colegio.edu.pe",
    "firstName": "Admin",
    "lastName": "SML",
    "role": {
      "name": "ADMIN",
      "permissions": [ { "permission": { "action": "read:students" } } ]
    }
  }
}
```

---

### POST `/auth/refresh-token`

> Pública

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST `/auth/logout`

> Requiere token  
> Invalida el refresh token en Redis

**Response 200:**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

### POST `/auth/change-password`

> Requiere token

**Request:**
```json
{
  "currentPassword": "Admin123!",
  "newPassword": "NuevoPass456!"
}
```

---

### POST `/auth/forgot-password`

> Pública  
> Rate limit: 5 intentos / minuto  
> Siempre retorna éxito (evita enumeración de emails)

**Request:**
```json
{ "email": "usuario@colegio.edu.pe" }
```

---

## 8. Módulo Users (ADMIN)

### GET `/users`

```
GET /users?role=TEACHER&status=ACTIVE&search=carlos&page=1&pageSize=20
```

Filtros disponibles: `role` (`ADMIN|TEACHER|STUDENT|PARENT`), `status` (`ACTIVE|INACTIVE|SUSPENDED`), `search`

---

### POST `/users`

```json
{
  "email": "nuevo@colegio.edu.pe",
  "password": "Pass123!",
  "firstName": "Nuevo",
  "lastName": "Usuario",
  "phone": "+51999888777",
  "role": "TEACHER"
}
```

---

### PUT `/users/:id`

Acepta los mismos campos que POST excepto `email` y `password`.

---

### PATCH `/users/:id/status`

```json
{ "status": "INACTIVE" }
```

Valores: `ACTIVE | INACTIVE | SUSPENDED`

---

### POST `/users/:id/reset-password`

Sin body. Genera contraseña temporal y la retorna (en producción debería enviarse por email).

```json
{
  "success": true,
  "data": {
    "message": "Password reset. Temporary password sent to user email.",
    "tempPassword": "abc123A1!"
  }
}
```

---

## 9. Módulo Students (ADMIN)

### GET `/students`

```
GET /students?grade=1ro Secundaria&section=A&status=ACTIVE&search=ana&page=1&pageSize=20
```

### POST `/students`

Crea usuario + perfil de estudiante en una sola llamada:

```json
{
  "email": "ana.garcia@colegio.edu.pe",
  "password": "Student123!",
  "firstName": "Ana",
  "lastName": "García",
  "phone": "+51999000111",
  "studentCode": "2025-001",
  "birthDate": "2010-05-15",
  "gender": "F",
  "address": "Av. Lima 123",
  "bloodType": "O+",
  "medicalNotes": "Alérgica a la penicilina"
}
```

### GET `/students/:id`

Retorna estudiante con matrículas activas y padres vinculados.

### GET `/students/:id/academic-history`

Historial de todas las matrículas (todas las secciones y años).

### GET `/students/:id/grades`

Notas agrupadas por período y curso.

### GET `/students/:id/attendance`

Registro de asistencia completo.

### GET `/students/:id/parents`

Lista de padres vinculados al estudiante.

### POST `/students/:id/parents`

Vincular padre existente:

```json
{
  "parentId": "clxyz456",
  "isPrimary": true
}
```

### DELETE `/students/:id/parents/:parentId`

Desvincula el padre sin eliminarlo.

### Documentos del estudiante

```
GET    /students/:id/documents
POST   /students/:id/documents          (multipart, campo: files)
DELETE /students/:id/documents/:docId
GET    /students/:id/documents/:docId/download  → redirect 307
```

### POST `/students/import`

Importación masiva (skeleton, pendiente de implementar):

```json
{ "records": [ ... ] }
```

---

## 10. Módulo Parents (ADMIN)

### POST `/parents`

```json
{
  "email": "luis.garcia@gmail.com",
  "password": "Parent123!",
  "firstName": "Luis",
  "lastName": "García",
  "phone": "+51999555444",
  "relationship": "Padre",
  "occupation": "Ingeniero"
}
```

### GET `/parents/:id/children`

Hijos vinculados con datos de matrícula activa.

### GET `/parents/:id/payments`

Historial de pagos del padre.

---

## 11. Módulo Teachers (ADMIN)

### POST `/teachers`

```json
{
  "email": "carlos.mendoza@colegio.edu.pe",
  "password": "Teacher123!",
  "firstName": "Carlos",
  "lastName": "Mendoza",
  "teacherCode": "TCH-002",
  "specialty": "Matemáticas",
  "bio": "Licenciado en Educación..."
}
```

### GET `/teachers/:id/courses/active`

Cursos activos con sección asignada.

### GET `/teachers/:id/courses/history`

Historial de todas las asignaciones.

### POST `/teachers/:id/courses`

Asignar curso:

```json
{
  "courseId": "clxyz123",
  "sectionId": "clxyz456",
  "academicYearId": "clxyz789"
}
```

### DELETE `/teachers/:id/courses/:courseId`

Marca la asignación como inactiva (no elimina).

---

## 12. Módulo Courses (ADMIN)

### POST `/courses`

```json
{
  "name": "Matemáticas",
  "code": "MAT-001",
  "description": "Curso de matemáticas básicas",
  "grade": "1ro Secundaria",
  "level": "Secundaria",
  "hours": 5
}
```

Filtros GET: `grade`, `level`, `status` (`ACTIVE|INACTIVE|ARCHIVED`)

---

## 13. Módulo Sections (ADMIN)

### POST `/sections`

```json
{
  "name": "A",
  "grade": "1ro Secundaria",
  "level": "Secundaria",
  "academicYearId": "clxyz123",
  "capacity": 30
}
```

---

## 14. Módulo Academic Years (ADMIN)

### POST `/academic-years`

```json
{
  "name": "2025",
  "startDate": "2025-03-01",
  "endDate": "2025-12-20",
  "status": "ACTIVE"
}
```

`status`: `ACTIVE | CLOSED | UPCOMING`

### GET `/academic-years/:id/periods`

Retorna los bimestres/trimestres del año académico.

---

## 15. Módulo Enrollments (ADMIN)

### POST `/enrollments`

```json
{
  "studentId": "clxyz123",
  "sectionId": "clxyz456",
  "academicYearId": "clxyz789"
}
```

### PUT `/enrollments/:id`

```json
{ "status": "WITHDRAWN" }
```

`status`: `ACTIVE | WITHDRAWN | TRANSFERRED | COMPLETED`

Filtros GET: `grade`, `section`, `year`

---

## 16. Módulo Teacher Assignments (ADMIN)

### POST `/teacher-assignments`

```json
{
  "teacherId": "clxyz111",
  "courseId": "clxyz222",
  "sectionId": "clxyz333",
  "academicYearId": "clxyz444"
}
```

### PUT `/teacher-assignments/:id`

```json
{ "isActive": false }
```

---

## 17. Módulo Roles (ADMIN)

### GET `/roles`

Retorna los 4 roles con sus permisos asignados y cantidad de usuarios.

### PUT `/roles/:id`

Actualiza descripción o reemplaza la lista de permisos:

```json
{
  "description": "Profesor con acceso extendido",
  "permissions": [
    "read:students",
    "read:grades",
    "create:grades",
    "update:grades",
    "read:attendance",
    "create:attendance",
    "read:announcements",
    "read:messages",
    "send:messages",
    "upload:files",
    "download:files"
  ]
}
```

Lista completa de permisos disponibles:

```
read:users        create:users      update:users      delete:users
read:students     create:students   update:students   delete:students
read:teachers     create:teachers   update:teachers   delete:teachers
read:parents      create:parents    update:parents
read:courses      create:courses    update:courses    delete:courses
read:announcements create:announcements update:announcements delete:announcements
read:reports
read:enrollments  create:enrollments update:enrollments
read:grades       create:grades     update:grades
read:attendance   create:attendance
read:messages     send:messages
upload:files      download:files
```

---

## 18. Módulo Reports (ADMIN)

### GET `/reports/:type`

| Tipo | Query params opcionales |
|---|---|
| `students` | `status` |
| `attendance` | `courseId`, `startDate`, `endDate` |
| `grades` | `periodId`, `courseId` |
| `enrollments` | `academicYearId`, `status` |
| `teachers` | — |
| `payments` | `status` |

```
GET /reports/grades?periodId=clxyz123&courseId=clxyz456
```

> Los reportes actualmente retornan JSON con los datos. La generación de PDF/Excel está pendiente de implementar.

---

## 19. Módulo Announcements

> Lectura: todos los roles autenticados  
> Creación / edición / eliminación: solo ADMIN

### GET `/announcements`

```
GET /announcements?type=GENERAL&priority=HIGH&read=false&search=reunión&page=1
```

Filtros: `type` (`GENERAL|ACADEMIC|EVENT|URGENT`), `priority` (`LOW|MEDIUM|HIGH`), `read` (`true|false`), `search`

**Response** (incluye si el usuario actual ya lo leyó):

```json
{
  "success": true,
  "data": [
    {
      "id": "clxyz123",
      "title": "Reunión de padres",
      "content": "El próximo viernes...",
      "type": "GENERAL",
      "priority": "HIGH",
      "targetRoles": ["PARENT", "STUDENT"],
      "publishedAt": "2026-03-07T00:00:00.000Z",
      "isRead": false,
      "readAt": null,
      "author": { "firstName": "Admin", "lastName": "SML" },
      "attachments": []
    }
  ]
}
```

### POST `/announcements`

```json
{
  "title": "Reunión de padres",
  "content": "El próximo viernes 14 de marzo...",
  "type": "GENERAL",
  "priority": "HIGH",
  "targetRoles": ["PARENT", "STUDENT", "TEACHER"],
  "publishedAt": "2026-03-07T00:00:00.000Z",
  "expiresAt": "2026-03-15T00:00:00.000Z"
}
```

### PATCH `/announcements/:id/read`

Sin body. Marca el comunicado como leído para el usuario actual.

### POST `/announcements/:id/attachments`

Multipart, campo `files`.

### GET `/announcements/:id/attachments/:fileId/download`

Redirect 307 a URL firmada.

---

## 20. Portal del Profesor

> Todas las rutas requieren rol `TEACHER`  
> El parámetro `courseId` en estas rutas es en realidad el **ID del `TeacherAssignment`** (la asignación docente), no el ID del curso en sí.

### Cursos

```
GET /teacher/courses?search=matemáticas&period=2025
GET /teacher/courses/:courseId
GET /teacher/courses/:courseId/students?search=ana
GET /teacher/courses/:courseId/students/:studentId
```

### Tareas

```
GET    /teacher/courses/:courseId/tasks?status=PUBLISHED&search=examen
GET    /teacher/courses/:courseId/tasks/:taskId
POST   /teacher/courses/:courseId/tasks          (multipart)
PUT    /teacher/courses/:courseId/tasks/:taskId
DELETE /teacher/courses/:courseId/tasks/:taskId
```

**Crear tarea (multipart):**

```
Campo    : title           (texto)
Campo    : description     (texto, opcional)
Campo    : dueDate         (ISO date string, opcional)
Campo    : maxScore        (número, default 20)
Campo    : status          (DRAFT|PUBLISHED, default DRAFT)
Campo    : unitId          (string, opcional)
Campo    : files           (archivo binario, hasta 5 archivos)
```

### Entregas

```
GET /teacher/courses/:courseId/tasks/:taskId/submissions?status=SUBMITTED&search=ana
PUT /teacher/courses/:courseId/tasks/:taskId/submissions/:submissionId/grade
```

**Calificar entrega:**

```json
{
  "score": 18.5,
  "feedback": "Buen trabajo, pero faltó desarrollar el punto 3."
}
```

### Asistencia

```
GET  /teacher/courses/:courseId/attendance?date=2026-03-07
POST /teacher/courses/:courseId/attendance
GET  /teacher/courses/:courseId/attendance/history
```

**Registrar asistencia:**

```json
{
  "records": [
    { "studentId": "clxyz111", "date": "2026-03-07", "status": "PRESENT" },
    { "studentId": "clxyz222", "date": "2026-03-07", "status": "ABSENT", "notes": "Avisó por teléfono" },
    { "studentId": "clxyz333", "date": "2026-03-07", "status": "LATE" }
  ]
}
```

`status`: `PRESENT | ABSENT | LATE | JUSTIFIED`

### Notas

```
GET  /teacher/courses/:courseId/grades
POST /teacher/courses/:courseId/grades
PUT  /teacher/courses/:courseId/grades/:gradeId
```

**Registrar nota:**

```json
{
  "studentId": "clxyz111",
  "periodId": "clxyz999",
  "score": 17.0,
  "notes": "Mejoró en la segunda evaluación"
}
```

### Materiales

```
GET    /teacher/courses/:courseId/materials
POST   /teacher/courses/:courseId/materials          (multipart)
PUT    /teacher/courses/:courseId/materials/:materialId
DELETE /teacher/courses/:courseId/materials/:materialId
```

**Subir material (multipart):**

```
title       : "Capítulo 3 - Álgebra"
description : "Ejercicios del capítulo 3"
unitId      : "clxyz_unit_1"   (opcional)
files       : [archivo1.pdf, archivo2.docx]
```

### Perfil del profesor

```
GET  /teacher/profile
PUT  /teacher/profile
POST /teacher/profile/photo    (multipart, campo: photo)
```

**Actualizar perfil:**

```json
{
  "bio": "Licenciado en Matemáticas con 10 años de experiencia.",
  "specialty": "Álgebra y Geometría",
  "phone": "+51999888777"
}
```

---

## 21. Portal del Estudiante

> Todas las rutas requieren rol `STUDENT`  
> El parámetro `courseId` es el ID del `TeacherAssignment`.

### Cursos

```
GET /student/courses
GET /student/courses/:courseId
GET /student/courses/:courseId/units
GET /student/courses/:courseId/tasks
GET /student/courses/:courseId/grades
GET /student/courses/:courseId/materials/:unitId/download   → redirect 307
```

### Tareas

```
GET  /student/tasks?status=PENDING&search=examen&courseId=clxyz
GET  /student/tasks/:id
POST /student/tasks/:id/submit                              (multipart)
GET  /student/tasks/:id/materials/:fileId/download          → redirect 307
```

`status` filtro: `PENDING` (sin entregar) | `SUBMITTED` | `GRADED`

**Entregar tarea (multipart):**

```
content : "Mi solución es..."
files   : [archivo1.pdf]
```

### Notas y asistencia

```
GET /student/grades?period=clxyz&courseId=clxyz
GET /student/grades/export?period=clxyz    (pendiente PDF/Excel)
GET /student/attendance?month=2026-03&courseId=clxyz
```

### Perfil

```
GET  /student/profile
POST /student/profile/photo    (multipart, campo: photo)
GET  /student/settings
PUT  /student/settings
```

**Actualizar settings:**

```json
{
  "notifications": true,
  "language": "es",
  "theme": "dark"
}
```

---

## 22. Portal del Padre

> Todas las rutas requieren rol `PARENT`  
> El parámetro `childId` es el ID del `Student` (no del User).

### Hijos

```
GET /parent/children
GET /parent/children/:childId
GET /parent/children/:childId/courses
GET /parent/children/:childId/courses/:courseId
GET /parent/children/:childId/courses/:courseId/units
GET /parent/children/:childId/courses/:courseId/tasks
GET /parent/children/:childId/tasks?status=PENDING&search=examen
GET /parent/children/:childId/grades
GET /parent/children/:childId/grades/export
GET /parent/children/:childId/attendance
```

### Justificaciones

```
GET  /parent/children/:childId/justifications
POST /parent/children/:childId/justifications   (multipart)
```

**Enviar justificación (multipart):**

```
reason : "Mi hijo estuvo enfermo con fiebre"
date   : "2026-03-05"
files  : [certificado_medico.pdf]
```

### Pagos

```
GET /parent/children/:childId/payments?status=PENDING&category=pension&search=marzo
GET /parent/children/:childId/payments/:paymentId/receipt   → redirect 307
```

`status`: `PENDING | PAID | OVERDUE | CANCELLED`  
`category` ejemplos: `matricula`, `pension`, `actividades`

---

## 23. Módulo Messaging

> Roles: `TEACHER` y `PARENT`

```
GET   /messaging/conversations?courseId=clxyz
GET   /messaging/conversations?childId=clxyz
GET   /messaging/conversations/:id
POST  /messaging/conversations/:id/messages
PATCH /messaging/conversations/:id/read
POST  /messaging/conversations
```

### Obtener conversaciones

El profesor filtra por `courseId` (TeacherAssignment ID).  
El padre filtra por `childId` (Student ID) — aunque actualmente el backend filtra por participante automáticamente.

### Enviar mensaje

```json
{ "content": "Hola, quería consultar sobre la nota del examen." }
```

### Crear conversación (nueva)

```json
{
  "teacherId": "clxyz_teacher",
  "parentId": "clxyz_parent",
  "subject": "Consulta sobre notas",
  "teacherAssignmentId": "clxyz_assignment"
}
```

---

## 24. Módulo Dashboards

> Cada dashboard solo es accesible por su rol correspondiente.  
> **Caché Redis de 60 segundos** (admin: 120s) — los datos pueden tener hasta 1 minuto de desfase.

```
GET /dashboard/student
GET /dashboard/teacher
GET /dashboard/admin
GET /dashboard/parent?childId=clxyz   (childId opcional — si se omite, resume todos los hijos)
```

### Respuesta dashboard estudiante

```json
{
  "success": true,
  "data": {
    "student": {
      "name": "Ana García",
      "studentCode": "2025-001",
      "section": "A",
      "grade": "1ro Secundaria",
      "academicYear": "2025"
    },
    "summary": {
      "pendingTasks": 3,
      "totalCourses": 8,
      "attendanceSummary": { "PRESENT": 45, "ABSENT": 2, "LATE": 1 }
    },
    "recentGrades": [ ... ],
    "recentAnnouncements": [ ... ]
  }
}
```

### Respuesta dashboard admin

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalStudents": 342,
      "totalTeachers": 28,
      "totalParents": 280,
      "activeEnrollments": 340,
      "pendingJustifications": 5,
      "pendingPayments": 12
    },
    "recentAnnouncements": [ ... ]
  }
}
```

---

## 25. Guía por rol

### ADMIN — menú de navegación sugerido

```
/users                 → Gestión de usuarios
/students              → Estudiantes
/teachers              → Profesores
/parents               → Padres
/courses               → Cursos
/sections              → Secciones
/academic-years        → Años académicos
/enrollments           → Matrículas
/teacher-assignments   → Asignaciones docentes
/announcements         → Comunicados
/roles                 → Roles y permisos
/reports               → Reportes
/dashboard/admin       → Dashboard
```

### TEACHER — menú de navegación sugerido

```
/dashboard/teacher             → Dashboard
/teacher/courses               → Mis cursos
  /teacher/courses/:id/tasks       → Tareas
  /teacher/courses/:id/attendance  → Asistencia
  /teacher/courses/:id/grades      → Notas
  /teacher/courses/:id/materials   → Materiales
/teacher/profile               → Mi perfil
/messaging/conversations       → Mensajería
/announcements                 → Comunicados
```

### STUDENT — menú de navegación sugerido

```
/dashboard/student       → Dashboard
/student/courses         → Mis cursos
/student/tasks           → Mis tareas
/student/grades          → Mis notas
/student/attendance      → Mi asistencia
/student/profile         → Mi perfil
/announcements           → Comunicados
```

### PARENT — menú de navegación sugerido

```
/dashboard/parent           → Dashboard
/parent/children            → Mis hijos
  /parent/children/:id          → Detalle del hijo
  /parent/children/:id/grades   → Notas
  /parent/children/:id/attendance → Asistencia
  /parent/children/:id/tasks    → Tareas
  /parent/children/:id/payments → Pagos
  /parent/children/:id/justifications → Justificaciones
/messaging/conversations    → Mensajería
/announcements              → Comunicados
```

---

## 26. Ejemplo de cliente HTTP (TypeScript)

Ejemplo de cliente base con Axios para usar en React/Next.js/Vue:

```typescript
// lib/api.ts
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  // Opcional: persistir refreshToken en cookie httpOnly via endpoint propio
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('refreshToken');
}

const api = axios.create({ baseURL: BASE_URL });

// Request interceptor — añadir Bearer token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — renovar token en 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefresh = refreshToken ?? localStorage.getItem('refreshToken');
      if (!storedRefresh) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken: storedRefresh,
        });
        const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
        setTokens(newAccess, newRefresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Uso en componentes

```typescript
// login
import api, { setTokens } from '@/lib/api';

async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  setTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.user;
}

// listar estudiantes
async function getStudents(page = 1, search?: string) {
  const { data } = await api.get('/students', { params: { page, pageSize: 20, search } });
  return { items: data.data, meta: data.meta };
}

// subir documento de estudiante
async function uploadStudentDocument(studentId: string, files: File[]) {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const { data } = await api.post(`/students/${studentId}/documents`, formData);
  return data.data;
}

// calificar entrega
async function gradeSubmission(
  courseId: string,
  taskId: string,
  submissionId: string,
  score: number,
  feedback: string
) {
  const { data } = await api.put(
    `/teacher/courses/${courseId}/tasks/${taskId}/submissions/${submissionId}/grade`,
    { score, feedback }
  );
  return data.data;
}

// registrar asistencia
async function saveAttendance(courseId: string, records: AttendanceRecord[]) {
  const { data } = await api.post(`/teacher/courses/${courseId}/attendance`, { records });
  return data.data;
}
```

---

## Notas finales

### IDs importantes

| Concepto | ID a usar |
|---|---|
| Usuario autenticado | `user.id` (viene en `/auth/me`) |
| Perfil de estudiante | `student.id` (distinto del `user.id`) |
| Perfil de profesor | `teacher.id` (distinto del `user.id`) |
| Perfil de padre | `parent.id` (distinto del `user.id`) |
| Curso en portal docente/estudiante | ID del `TeacherAssignment`, **no** del `Course` |

### Relación User ↔ Perfil

Cada usuario tiene un único perfil según su rol:

```
User (id, email, firstName, lastName)
  └── Student (id, studentCode, birthDate, ...)
  └── Teacher (id, teacherCode, specialty, ...)
  └── Parent  (id, relationship, occupation, ...)
```

Cuando el front trabaja con el **portal** (`/student/*`, `/teacher/*`, `/parent/*`), el backend resuelve automáticamente el perfil a partir del `userId` del JWT. No necesitas pasar el `studentId` — el backend lo sabe por el token.

### Rate limits activos

| Endpoint | Límite |
|---|---|
| `POST /auth/login` | 10 req / min |
| `POST /auth/forgot-password` | 5 req / min |
| Resto de rutas | 100 req / min (global) |
