# Diseño de Vistas - Portal para Estudiantes

## Documentación Funcional y UX/UI

**Versión:** 1.0  
**Fecha:** 2024  
**Audiencia:** Estudiantes de Educación Secundaria  
**Plataforma:** Angular Web Application

---

## Principios de Diseño

### Usabilidad para Estudiantes de Secundaria
- **Interfaz intuitiva:** Iconografía clara y reconocible
- **Navegación simple:** Máximo 3 niveles de profundidad
- **Feedback visual:** Estados claros (cargando, éxito, error)
- **Responsive:** Adaptable a dispositivos móviles y tablets
- **Accesibilidad:** Contraste adecuado, textos legibles, navegación por teclado
- **Gamificación sutil:** Badges, progreso visual, logros

### Paleta de Colores Sugerida
- **Primario:** Azul institucional (#1E40AF)
- **Secundario:** Verde éxito (#10B981)
- **Advertencia:** Amarillo (#F59E0B)
- **Error:** Rojo (#EF4444)
- **Fondo:** Gris claro (#F3F4F6)
- **Texto:** Gris oscuro (#1F2937)

---

## 1. Login / Autenticación

### Objetivo
Permitir a los estudiantes acceder de forma segura al portal mediante credenciales únicas, con opciones de recuperación de contraseña y validación por rol.

### Elementos Visibles

#### Header
- Logo del colegio (centrado)
- Nombre del portal: "Portal Estudiantil"

#### Formulario de Login
- **Campo Usuario/Código:**
  - Input con icono de usuario
  - Placeholder: "Código de estudiante o email"
  - Validación en tiempo real

- **Campo Contraseña:**
  - Input tipo password con icono de candado
  - Botón "Mostrar/Ocultar" contraseña (icono de ojo)
  - Placeholder: "Ingresa tu contraseña"

- **Checkbox "Recordarme":**
  - Opción para mantener sesión activa

- **Botón "Iniciar Sesión":**
  - Estilo primario, ancho completo
  - Estado deshabilitado mientras carga
  - Spinner durante autenticación

#### Enlaces de Ayuda
- "¿Olvidaste tu contraseña?" (debajo del botón)
- "¿Necesitas ayuda?" (enlace de soporte)

#### Footer
- Información de contacto del colegio
- Año académico actual
- Versión del portal

### Funcionalidades Clave

1. **Autenticación:**
   - Validación de credenciales contra base de datos
   - Encriptación de contraseña (bcrypt)
   - Generación de token JWT para sesión
   - Redirección según rol (estudiante/docente/admin)

2. **Recuperación de Contraseña:**
   - Modal o vista separada para recuperación
   - Campo: código de estudiante o email
   - Envío de código de verificación por email
   - Formulario de nueva contraseña con validación
   - Confirmación de contraseña

3. **Cambio de Contraseña (Primera vez):**
   - Detección de contraseña temporal
   - Forzar cambio en primer acceso
   - Validación de fortaleza (mínimo 8 caracteres, mayúscula, número)

4. **Validación de Credenciales:**
   - Mensajes de error específicos:
     - "Usuario no encontrado"
     - "Contraseña incorrecta"
     - "Cuenta deshabilitada"
     - "Debes cambiar tu contraseña"
   - Rate limiting (máximo 5 intentos en 15 minutos)

5. **Seguridad:**
   - CAPTCHA después de 3 intentos fallidos
   - Logs de intentos de acceso
   - Sesión expira después de inactividad (30 minutos)

### Estados de la Vista
- **Inicial:** Formulario vacío, botón habilitado
- **Validando:** Spinner en botón, campos deshabilitados
- **Error:** Mensaje de error debajo del campo correspondiente
- **Éxito:** Redirección automática al dashboard

---

## 2. Dashboard del Estudiante

### Objetivo
Proporcionar una vista general del estado académico del estudiante con acceso rápido a las funcionalidades principales y alertas importantes.

### Elementos Visibles

#### Header/Navbar
- Logo del colegio (izquierda)
- Menú hamburguesa (móvil) / Menú horizontal (desktop)
- Avatar del estudiante con menú desplegable
- Notificaciones (badge con contador)
- Botón de cierre de sesión

#### Sección de Bienvenida
- Saludo personalizado: "¡Hola, [Nombre]!"
- Grado y sección actual
- Fecha y hora actual

#### Tarjetas de Resumen Académico (Grid 2x2 en móvil, 4 columnas en desktop)
1. **Promedio General:**
   - Número grande destacado
   - Indicador de tendencia (↑↓) vs período anterior
   - Color según rendimiento (verde/amarillo/rojo)

2. **Tareas Pendientes:**
   - Contador de tareas por vencer
   - Badge de urgencia (rojo si hay vencidas)
   - Enlace a vista de tareas

3. **Asistencia del Mes:**
   - Porcentaje de asistencia
   - Faltas registradas
   - Indicador visual (barra de progreso)

4. **Próximas Evaluaciones:**
   - Contador de evaluaciones en los próximos 7 días
   - Lista compacta con fecha y curso

#### Alertas Importantes (Banner superior)
- Notificaciones críticas (faltas excesivas, tareas vencidas)
- Comunicados urgentes del colegio
- Badge de "Nuevo" para alertas no leídas
- Botón "Cerrar" para cada alerta

#### Accesos Rápidos (Grid de iconos grandes)
- **Mis Cursos:** Icono de libro, contador de cursos activos
- **Tareas:** Icono de checklist, badge con pendientes
- **Notas:** Icono de gráfico, enlace directo
- **Asistencia:** Icono de calendario, resumen mensual
- **Comunicados:** Icono de megáfono, badge de no leídos
- **Perfil:** Icono de usuario, acceso rápido

#### Calendario Académico (Widget lateral)
- Vista mensual compacta
- Eventos destacados (evaluaciones, fechas importantes)
- Navegación entre meses
- Enlace a calendario completo

#### Actividad Reciente
- Timeline de últimas actividades:
  - Tareas entregadas
  - Notas publicadas
  - Comunicados recibidos
  - Comentarios de docentes

### Funcionalidades Clave

1. **Carga de Datos:**
   - Carga asíncrona de todas las secciones
   - Skeleton loaders mientras carga
   - Refresh manual con botón de actualizar

2. **Navegación Rápida:**
   - Click en cualquier tarjeta redirige a vista detallada
   - Atajos de teclado para accesos frecuentes

3. **Personalización:**
   - Drag & drop para reordenar widgets (futuro)
   - Preferencias de visibilidad de secciones

4. **Notificaciones en Tiempo Real:**
   - WebSocket o polling para nuevas notificaciones
   - Badge dinámico en icono de notificaciones
   - Sonido opcional para alertas críticas

5. **Filtros y Búsqueda:**
   - Buscador global en header
   - Filtro de alertas por tipo

---

## 3. Perfil del Estudiante

### Objetivo
Mostrar y permitir la visualización de información personal y académica del estudiante, incluyendo foto de perfil y datos de grado/sección.

### Elementos Visibles

#### Header del Perfil
- Foto del estudiante (circular, grande, centrada)
- Botón "Cambiar foto" (hover sobre imagen)
- Nombre completo del estudiante
- Código de estudiante
- Grado y sección actual

#### Tabs o Secciones
1. **Datos Personales:**
   - Información básica (solo lectura):
     - Nombre completo
     - Fecha de nacimiento
     - Edad
     - DNI/Identificación
     - Dirección
     - Teléfono
     - Email
     - Nombre del apoderado/tutor
     - Teléfono de emergencia

2. **Datos Académicos:**
   - Año académico actual
   - Grado y sección
   - Turno (mañana/tarde)
   - Fecha de ingreso al colegio
   - Historial de grados cursados
   - Promedio histórico
   - Estado académico (regular, condicional, etc.)

3. **Foto y Avatar:**
   - Vista previa de foto actual
   - Upload de nueva foto
   - Validación de formato (JPG, PNG, max 2MB)
   - Recorte de imagen (opcional)

#### Información Adicional
- QR Code del estudiante (para identificación)
- Badges/Logros obtenidos
- Estadísticas de participación

### Funcionalidades Clave

1. **Visualización de Datos:**
   - Datos en modo solo lectura (editables solo por administración)
   - Formato legible y organizado
   - Iconos descriptivos para cada campo

2. **Gestión de Foto:**
   - Upload de imagen desde dispositivo
   - Preview antes de guardar
   - Validación de tamaño y formato
   - Recorte opcional (aspect ratio 1:1)
   - Actualización sin recargar página

3. **Exportación:**
   - Botón "Descargar perfil PDF"
   - Generación de reporte con datos completos

4. **Historial Académico:**
   - Timeline visual de años cursados
   - Promedios por año
   - Certificados y reconocimientos

5. **Seguridad:**
   - Confirmación antes de cambiar foto
   - Logs de cambios realizados

---

## 4. Cursos / Aulas Virtuales

### Objetivo
Mostrar la lista de cursos matriculados del estudiante con información del docente y acceso rápido a materiales y tareas.

### Elementos Visibles

#### Header de la Vista
- Título: "Mis Cursos"
- Filtros:
  - Selector de período académico
  - Búsqueda por nombre de curso
  - Filtro por estado (activo/finalizado)

#### Grid de Tarjetas de Cursos
Cada tarjeta contiene:

**Encabezado de Tarjeta:**
- Código del curso (ej: MAT-2024)
- Nombre del curso (ej: "Matemática")
- Badge de estado (Activo/Finalizado)

**Información del Docente:**
- Foto del docente (circular, pequeña)
- Nombre completo del docente
- Email de contacto (enlace)
- Horario de atención (si aplica)

**Métricas Rápidas:**
- Promedio actual del curso
- Tareas pendientes (badge con número)
- Próxima evaluación (fecha)
- Última actividad (timestamp)

**Acciones Rápidas:**
- Botón principal: "Ver Detalle" (lleva a vista de detalle)
- Botón secundario: "Materiales" (acceso directo)
- Botón secundario: "Tareas" (acceso directo)

**Indicadores Visuales:**
- Barra de progreso del curso (si aplica)
- Color según rendimiento (verde/amarillo/rojo)
- Icono de notificaciones nuevas (si hay)

#### Vista Alternativa (Lista)
- Toggle para cambiar entre grid y lista
- Lista compacta con información esencial
- Ordenamiento por nombre, promedio, o fecha

#### Estado Vacío
- Mensaje: "No tienes cursos asignados"
- Ilustración o icono
- Contacto de soporte

### Funcionalidades Clave

1. **Carga de Cursos:**
   - Carga desde API con información completa
   - Cache local para mejor rendimiento
   - Actualización automática de métricas

2. **Filtrado y Búsqueda:**
   - Búsqueda en tiempo real
   - Filtros combinables
   - Persistencia de filtros en localStorage

3. **Navegación:**
   - Click en tarjeta → Vista detalle del curso
   - Accesos directos a secciones específicas
   - Breadcrumb para navegación

4. **Notificaciones:**
   - Badge de notificaciones por curso
   - Indicador de contenido nuevo
   - Marcar como leído al entrar

5. **Ordenamiento:**
   - Por nombre (A-Z, Z-A)
   - Por promedio (mayor-menor)
   - Por fecha de última actividad
   - Por tareas pendientes

---

## 5. Detalle de Curso

### Objetivo
Proporcionar una vista completa del contenido de un curso específico, incluyendo materiales, tareas, evaluaciones y recursos adicionales.

### Elementos Visibles

#### Header del Curso
- Nombre del curso (grande, destacado)
- Código del curso
- Docente responsable (con foto y contacto)
- Período académico
- Promedio actual (badge destacado)

#### Tabs de Navegación
1. **Contenido del Curso:**
   - Silabo o plan de estudios
   - Unidades temáticas
   - Objetivos de aprendizaje
   - Cronograma de temas

2. **Materiales:**
   - Lista de materiales descargables
   - Organizados por unidad o fecha
   - Tipo de archivo (PDF, video, enlace)
   - Tamaño de archivo
   - Fecha de publicación
   - Botón de descarga
   - Vista previa (si aplica)

3. **Tareas y Evaluaciones:**
   - Lista completa de tareas
   - Filtros: Pendientes, Entregadas, Vencidas
   - Estado de cada tarea
   - Fecha límite destacada
   - Enlace a detalle de tarea

4. **Foro/Comentarios:**
   - Espacio para preguntas al docente
   - Comentarios y respuestas
   - Formulario para nueva pregunta

5. **Calificaciones:**
   - Tabla de notas del curso
   - Desglose por evaluación
   - Promedio parcial y final
   - Gráfico de evolución

#### Sidebar (Desktop)
- Información del docente
- Horario de clases
- Enlaces rápidos
- Calendario del curso

#### Breadcrumb
- Inicio > Cursos > [Nombre del Curso]

### Funcionalidades Clave

1. **Gestión de Materiales:**
   - Descarga individual o múltiple
   - Vista previa de PDFs
   - Reproductor de videos integrado
   - Historial de descargas

2. **Seguimiento de Tareas:**
   - Lista filtrable y ordenable
   - Indicadores visuales de estado
   - Acceso directo a entrega de tareas
   - Recordatorios de fechas límite

3. **Comunicación:**
   - Sistema de mensajería con docente
   - Notificaciones de respuestas
   - Archivos adjuntos en mensajes

4. **Análisis de Rendimiento:**
   - Gráficos de evolución de notas
   - Comparación con promedio del curso
   - Predicción de nota final

5. **Favoritos:**
   - Marcar materiales importantes
   - Lista de favoritos accesible

---

## 6. Tareas y Actividades

### Objetivo
Centralizar todas las tareas del estudiante en una sola vista, permitiendo gestión eficiente de entregas, seguimiento de fechas límite y visualización del estado.

### Elementos Visibles

#### Header con Filtros
- Título: "Mis Tareas"
- Filtros rápidos (chips):
  - Todas
  - Pendientes
  - Entregadas
  - Vencidas
  - Por vencer (próximos 7 días)
- Selector de curso (filtro adicional)
- Búsqueda por nombre de tarea
- Ordenamiento: Por fecha, por curso, por estado

#### Vista de Lista de Tareas
Cada tarea muestra:

**Información Principal:**
- Nombre de la tarea (enlace a detalle)
- Curso asociado (badge con color)
- Docente asignado
- Fecha de asignación
- Fecha límite (destacada, con countdown si está próxima)

**Estado Visual:**
- Badge de estado:
  - 🟢 Pendiente (verde claro)
  - 🟡 En revisión (amarillo)
  - 🔵 Entregada (azul)
  - 🔴 Vencida (rojo)
  - ⚪ No iniciada (gris)

**Métricas:**
- Porcentaje de avance (si aplica)
- Puntos posibles
- Puntos obtenidos (si está calificada)
- Archivos adjuntos requeridos

**Acciones:**
- Botón "Ver Detalle" / "Continuar"
- Botón "Entregar" (si está pendiente)
- Botón "Descargar" (materiales de referencia)

#### Vista de Calendario (Alternativa)
- Vista mensual con tareas marcadas
- Color por estado
- Click en fecha muestra tareas del día
- Navegación entre meses

#### Panel de Resumen (Sidebar)
- Total de tareas pendientes
- Tareas vencidas (alerta)
- Próximas a vencer (próximas 3 días)
- Promedio de entregas a tiempo
- Tareas calificadas recientemente

#### Modal/Vista de Detalle de Tarea
Al hacer click en una tarea:

**Información Completa:**
- Título y descripción completa
- Instrucciones detalladas
- Materiales de referencia (descargables)
- Rubrica de evaluación (si aplica)

**Entrega:**
- Área de texto para respuesta
- Upload de archivos (múltiples)
- Vista previa de archivos subidos
- Botón "Entregar Tarea"
- Confirmación antes de enviar

**Historial:**
- Versiones anteriores de entrega
- Comentarios del docente
- Calificación y retroalimentación

### Funcionalidades Clave

1. **Gestión de Entregas:**
   - Upload de múltiples archivos
   - Validación de tipos de archivo
   - Límite de tamaño por archivo
   - Vista previa antes de enviar
   - Edición hasta fecha límite

2. **Notificaciones:**
   - Recordatorios automáticos (3 días antes, 1 día antes)
   - Alerta de tareas vencidas
   - Notificación de calificación recibida

3. **Seguimiento:**
   - Historial completo de entregas
   - Comparación de versiones
   - Estadísticas personales

4. **Filtrado Avanzado:**
   - Múltiples filtros combinables
   - Búsqueda por texto
   - Guardado de filtros favoritos

5. **Exportación:**
   - Descarga de lista de tareas (PDF/Excel)
   - Calendario de tareas (iCal)

---

## 7. Notas y Evaluaciones

### Objetivo
Presentar de forma clara y organizada todas las calificaciones del estudiante, permitiendo análisis de rendimiento por curso y evaluación.

### Elementos Visibles

#### Header
- Título: "Mis Notas y Evaluaciones"
- Selector de período académico
- Selector de curso (opcional, "Todos los cursos")
- Botón "Exportar PDF"

#### Vista de Resumen General
- **Promedio General:**
  - Número grande destacado
  - Comparación con período anterior
  - Indicador de tendencia (↑↓)
  - Color según rendimiento

- **Gráfico de Rendimiento:**
  - Línea de tiempo con evolución de promedio
  - Comparación con promedio del curso
  - Marcadores de evaluaciones importantes

#### Vista por Curso (Tabs o Acordeón)
Para cada curso:

**Encabezado del Curso:**
- Nombre del curso
- Promedio del curso
- Posición en el ranking (opcional, si está habilitado)

**Tabla de Evaluaciones:**
| Tipo | Descripción | Fecha | Puntos | Obtenidos | Porcentaje | Estado |
|------|-------------|-------|--------|-----------|------------|--------|
| Examen Parcial | Unidad 1-3 | 15/03 | 100 | 85 | 85% | ✅ |
| Tarea | Proyecto Final | 20/03 | 50 | 45 | 90% | ✅ |
| ... | ... | ... | ... | ... | ... | ... |

**Promedios Parciales:**
- Promedio de exámenes
- Promedio de tareas
- Promedio de participación
- Promedio final (ponderado)

**Detalle de Evaluación (Modal):**
Al hacer click en una evaluación:
- Descripción completa
- Rubrica de evaluación
- Puntos desglosados por criterio
- Comentarios del docente
- Archivos adjuntos (si aplica)
- Fecha de publicación de nota

#### Vista Comparativa
- Gráfico de barras comparando cursos
- Tabla de promedios por curso
- Identificación de fortalezas y áreas de mejora

#### Filtros y Opciones
- Filtrar por tipo de evaluación
- Filtrar por rango de fechas
- Mostrar/ocultar cursos finalizados
- Ordenar por promedio o fecha

### Funcionalidades Clave

1. **Visualización de Datos:**
   - Gráficos interactivos (Chart.js o similar)
   - Tooltips con información detallada
   - Zoom en períodos específicos

2. **Análisis de Rendimiento:**
   - Cálculo automático de promedios
   - Identificación de tendencias
   - Alertas de bajo rendimiento
   - Sugerencias de mejora

3. **Exportación:**
   - Generación de boletín PDF
   - Exportación a Excel
   - Compartir con padres/tutores

4. **Notificaciones:**
   - Alerta de nueva calificación
   - Notificación de promedio actualizado
   - Recordatorio de evaluaciones próximas

5. **Historial:**
   - Acceso a notas de períodos anteriores
   - Comparación interanual
   - Evolución del rendimiento

---

## 8. Asistencia

### Objetivo
Mostrar el registro completo de asistencias del estudiante, incluyendo faltas, tardanzas y resúmenes mensuales para seguimiento personal.

### Elementos Visibles

#### Header
- Título: "Mi Asistencia"
- Selector de período (mes actual por defecto)
- Selector de curso (opcional, "Todos los cursos")
- Resumen destacado:
  - Porcentaje de asistencia del mes
  - Total de días asistidos
  - Total de faltas
  - Total de tardanzas

#### Calendario de Asistencia
- Vista mensual con días marcados:
  - 🟢 Presente (verde)
  - 🔴 Falta (rojo)
  - 🟡 Tardanza (amarillo)
  - ⚪ Sin registro (gris)
  - 🔵 Justificada (azul, si aplica)

- Click en día muestra detalle:
  - Hora de ingreso
  - Hora de salida
  - Observaciones
  - Justificación (si aplica)

#### Tabla Detallada
| Fecha | Curso/Horario | Estado | Hora Ingreso | Hora Salida | Observaciones |
|-------|---------------|--------|--------------|-------------|---------------|
| 15/03 | Matemática | Presente | 08:00 | 09:30 | - |
| 16/03 | Lengua | Falta | - | - | No justificada |
| 17/03 | Ciencias | Tardanza | 08:15 | 10:00 | Llegada tarde |
| ... | ... | ... | ... | ... | ... |

#### Gráficos y Estadísticas
- **Gráfico de Barras:**
  - Asistencia por mes
  - Comparación mes a mes

- **Gráfico Circular:**
  - Distribución: Presente / Faltas / Tardanzas

- **Tendencias:**
  - Línea de tiempo de porcentaje de asistencia
  - Proyección del mes actual

#### Resumen por Curso
- Tabla con asistencia por curso:
  - Nombre del curso
  - Días de clase
  - Días asistidos
  - Faltas
  - Porcentaje de asistencia
  - Estado (Regular/En riesgo)

#### Alertas
- Banner de advertencia si faltas exceden límite
- Notificación de riesgo de pérdida de año
- Recordatorio de justificar faltas

#### Sección de Justificaciones (Si aplica)
- Formulario para solicitar justificación
- Historial de justificaciones enviadas
- Estado de justificaciones (Aprobada/Pendiente/Rechazada)

### Funcionalidades Clave

1. **Registro en Tiempo Real:**
   - Actualización automática de asistencia
   - Sincronización con sistema de registro del colegio

2. **Filtrado:**
   - Por mes
   - Por curso
   - Por tipo de asistencia (presente/falta/tardanza)
   - Por rango de fechas

3. **Exportación:**
   - Descarga de reporte mensual (PDF)
   - Exportación a Excel
   - Compartir con padres/tutores

4. **Justificaciones:**
   - Upload de comprobantes (médico, etc.)
   - Seguimiento de estado
   - Notificaciones de aprobación/rechazo

5. **Análisis:**
   - Cálculo automático de porcentajes
   - Identificación de patrones
   - Alertas proactivas

---

## 9. Comunicados y Avisos

### Objetivo
Centralizar todos los comunicados institucionales y avisos dirigidos al estudiante, organizados por tipo y prioridad.

### Elementos Visibles

#### Header
- Título: "Comunicados y Avisos"
- Filtros:
  - Todos
  - Institucionales
  - Por Grado
  - Por Sección
  - Urgentes
- Búsqueda por texto
- Selector de período

#### Lista de Comunicados
Cada comunicado muestra:

**Encabezado:**
- Badge de tipo (Institucional/Grado/Sección)
- Badge de prioridad (Urgente/Importante/Normal)
- Fecha de publicación
- Badge "Nuevo" si no ha sido leído

**Contenido:**
- Título del comunicado (enlace a detalle)
- Resumen o extracto (primeras líneas)
- Autor/Remitente
- Fecha límite de lectura (si aplica)

**Acciones:**
- Botón "Leer más" / "Ver detalle"
- Botón "Marcar como leído"
- Icono de archivos adjuntos (si tiene)

#### Vista de Detalle
Al hacer click en un comunicado:

**Información Completa:**
- Título completo
- Contenido completo (formato rico)
- Fecha y hora de publicación
- Remitente (nombre y cargo)
- Destinatarios (Grado/Sección específica)

**Archivos Adjuntos:**
- Lista de archivos adjuntos
- Icono de tipo de archivo
- Tamaño del archivo
- Botón de descarga
- Vista previa (si aplica)

**Acciones:**
- Botón "Marcar como leído"
- Botón "Descargar todos los archivos"
- Botón "Compartir" (si aplica)
- Botón "Volver a lista"

#### Panel de Resumen (Sidebar)
- Total de comunicados no leídos
- Comunicados urgentes
- Comunicados del día
- Comunicados de la semana

#### Notificaciones
- Badge de contador en icono de notificaciones
- Lista desplegable de últimos comunicados
- Sonido opcional para urgentes

### Funcionalidades Clave

1. **Gestión de Lectura:**
   - Marcar como leído/no leído
   - Filtro de no leídos
   - Contador de no leídos
   - Auto-marcar al abrir detalle

2. **Priorización:**
   - Ordenamiento por prioridad y fecha
   - Destacado visual de urgentes
   - Notificaciones push para urgentes

3. **Búsqueda:**
   - Búsqueda full-text en contenido
   - Filtros combinables
   - Historial de búsquedas

4. **Archivos:**
   - Descarga individual o múltiple
   - Vista previa de PDFs
   - Organización por tipo

5. **Notificaciones:**
   - Sistema de notificaciones en tiempo real
   - Preferencias de notificación
   - Email opcional para urgentes

---

## 10. Configuración

### Objetivo
Permitir al estudiante gestionar sus preferencias de cuenta, cambiar contraseña y configurar opciones del portal.

### Elementos Visibles

#### Header
- Título: "Configuración"
- Breadcrumb: Inicio > Configuración

#### Menú Lateral (Desktop) / Tabs (Móvil)
1. **Cuenta y Seguridad**
2. **Preferencias**
3. **Notificaciones**
4. **Privacidad**

#### Sección: Cuenta y Seguridad

**Información de Cuenta:**
- Email actual (solo lectura, editable por admin)
- Código de estudiante (solo lectura)
- Último acceso registrado
- Estado de la cuenta

**Cambio de Contraseña:**
- Campo "Contraseña actual"
- Campo "Nueva contraseña"
- Campo "Confirmar nueva contraseña"
- Indicador de fortaleza de contraseña
- Reglas de validación visibles
- Botón "Cambiar contraseña"

**Sesiones Activas:**
- Lista de dispositivos con sesión activa
- Información de dispositivo (navegador, OS, IP)
- Fecha de último acceso
- Botón "Cerrar sesión" por dispositivo
- Botón "Cerrar todas las sesiones"

#### Sección: Preferencias

**Idioma:**
- Selector de idioma (Español/Inglés)
- Aplicación inmediata

**Tema:**
- Selector de tema (Claro/Oscuro/Auto)
- Vista previa

**Formato de Fecha:**
- Selector (DD/MM/YYYY, MM/DD/YYYY, etc.)

**Zona Horaria:**
- Selector automático o manual

**Densidad de Información:**
- Compacto / Normal / Ampliado

#### Sección: Notificaciones

**Preferencias de Notificación:**
- Toggle para cada tipo:
  - Nuevas tareas
  - Calificaciones publicadas
  - Comunicados urgentes
  - Recordatorios de tareas
  - Mensajes de docentes
  - Cambios en asistencia

**Canal de Notificación:**
- Notificaciones en portal (siempre activo)
- Email (toggle)
- Push notifications (toggle, si está disponible)

**Frecuencia de Resumen:**
- Diario / Semanal / Desactivado

#### Sección: Privacidad

**Visibilidad de Perfil:**
- Quién puede ver tu perfil (Estudiantes/Docentes/Todos)

**Datos Compartidos:**
- Información sobre qué datos se comparten
- Enlaces a política de privacidad

**Exportación de Datos:**
- Botón "Descargar mis datos" (GDPR compliance)
- Solicitud de eliminación de cuenta (si aplica)

#### Footer de Configuración
- Botón "Guardar cambios" (si hay cambios pendientes)
- Botón "Restaurar valores por defecto"
- Botón "Cerrar sesión" (destacado)
- Enlace "Eliminar cuenta" (con confirmación)

### Funcionalidades Clave

1. **Gestión de Contraseña:**
   - Validación de contraseña actual
   - Validación de fortaleza de nueva contraseña
   - Confirmación requerida
   - Mensaje de éxito/error
   - Logout automático después de cambio (opcional)

2. **Preferencias:**
   - Guardado automático o manual
   - Sincronización entre dispositivos
   - Reset a valores por defecto

3. **Sesiones:**
   - Lista de sesiones activas
   - Cierre remoto de sesiones
   - Notificación de cierre de sesión

4. **Notificaciones:**
   - Configuración granular
   - Vista previa de notificaciones
   - Test de notificaciones

5. **Privacidad:**
   - Exportación de datos en formato estándar
   - Confirmación de acciones destructivas
   - Logs de cambios de configuración

---

## Consideraciones Técnicas para Implementación Angular

### Componentes Reutilizables Sugeridos

1. **CardComponent:** Para tarjetas de cursos, tareas, etc.
2. **BadgeComponent:** Para estados, contadores, etiquetas
3. **ModalComponent:** Para detalles, confirmaciones
4. **TableComponent:** Para listas de datos
5. **ChartComponent:** Para gráficos de rendimiento
6. **CalendarComponent:** Para vistas de calendario
7. **FileUploadComponent:** Para carga de archivos
8. **NotificationComponent:** Para alertas y notificaciones
9. **BreadcrumbComponent:** Para navegación
10. **SkeletonLoaderComponent:** Para estados de carga

### Servicios Angular Sugeridos

1. **AuthService:** Autenticación y gestión de sesión
2. **StudentService:** Datos del estudiante
3. **CourseService:** Gestión de cursos
4. **TaskService:** Gestión de tareas
5. **GradeService:** Gestión de notas
6. **AttendanceService:** Gestión de asistencia
7. **NotificationService:** Sistema de notificaciones
8. **FileService:** Gestión de archivos
9. **SettingsService:** Configuración del usuario

### Guards y Resolvers

1. **AuthGuard:** Protección de rutas autenticadas
2. **RoleGuard:** Validación de rol de estudiante
3. **StudentResolver:** Precarga de datos del estudiante

### Estado Global (NgRx o Signals)

- Estado de autenticación
- Datos del estudiante actual
- Notificaciones no leídas
- Preferencias de usuario
- Cache de cursos y tareas

---

## Flujo de Navegación Principal

```
Login
  ↓
Dashboard
  ├─→ Perfil
  ├─→ Cursos
  │    └─→ Detalle de Curso
  ├─→ Tareas
  ├─→ Notas
  ├─→ Asistencia
  ├─→ Comunicados
  └─→ Configuración
```

---

## Responsive Design

### Breakpoints Sugeridos
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Adaptaciones Móviles
- Menú hamburguesa en lugar de menú horizontal
- Tarjetas en columna única
- Tabs en lugar de sidebar
- Modales a pantalla completa
- Botones más grandes para touch
- Swipe gestures para navegación

---

## Accesibilidad (WCAG 2.1 AA)

- Contraste mínimo 4.5:1 para texto
- Navegación por teclado completa
- Etiquetas ARIA apropiadas
- Focus visible en todos los elementos interactivos
- Textos alternativos en imágenes
- Lectores de pantalla compatibles

---

## Métricas de Éxito UX

- Tiempo de carga inicial < 3 segundos
- Tareas completadas en < 3 clics
- Tasa de abandono de login < 5%
- Satisfacción del usuario > 4/5
- Tiempo promedio de sesión > 10 minutos

---

**Fin del Documento de Diseño**
