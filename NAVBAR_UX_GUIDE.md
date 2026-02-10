# 🎨 Guía de Decisiones UX — Sidebar Premium Portal SML

## Por qué este sidebar se ve profesional

### 1. **Jerarquía Visual Clara con Agrupación Inteligente**
- **Menú agrupado por secciones**: "Principal", "Académico", "Comunicación", "Cuenta" — reduce carga cognitiva
- **Headers de sección** con tipografía pequeña y uppercase (jerarquía sin ruido visual)
- **Espaciado consistente** usando sistema de 8px (8/12/16/24) para respiración visual

### 2. **Estados Activos Elegantes y No Invasivos**
- **Desktop**: Gradiente sutil en el item activo + indicador lateral izquierdo (3px blanco)
- **Transiciones suaves** (200ms cubic-bezier) que dan feedback sin distraer
- **Soporte para rutas anidadas**: RouterLinkActive detecta automáticamente rutas hijas

### 3. **Microinteracciones Sutiles pero Efectivas**
- **Hover**: Transformación ligera (translateX 2px) + cambio de color suave
- **Tooltips en estado colapsado**: Aparecen al hover con animación fade-in
- **Focus visible mejorado**: Outline de 2px con color primario (accesibilidad WCAG AA)
- **Drawer mobile con backdrop blur**: Contexto visual sin distraer del contenido

### 4. **Responsive Real con Comportamiento Adaptativo**
- **Desktop (≥1024px)**: Sidebar fijo izquierdo, colapsable con botón toggle
- **Mobile (<1024px)**: Top bar minimal + drawer lateral con overlay
- **Breakpoint único y claro**: 1024px (tablet landscape) — no múltiples breakpoints confusos
- **Cierre automático**: Drawer se cierra al navegar o hacer click fuera

### 5. **Avatar + Chip de Rol con Identidad Visual**
- **Avatar con iniciales** si no hay foto (siempre hay identidad visual)
- **Chip de rol con colores diferenciados** por tipo de usuario (Estudiante azul, Profesor amarillo, Admin rojo, Padre púrpura)
- **Información del usuario siempre visible** en la parte superior del sidebar

### 6. **Accesibilidad Integrada desde el Diseño**
- **Atributos ARIA completos**: `aria-expanded`, `aria-label`, `aria-hidden`, `role="navigation"`
- **Navegación por teclado**: Tab, Enter, Escape funcionan correctamente
- **Focus visible mejorado**: No solo outline nativo, outline personalizado con color primario
- **Soporte para `prefers-reduced-motion`**: Respeta preferencias de usuario

### 7. **Estilo Institucional Premium sin Exagerar**
- **Colores institucionales usados con moderación**: Azul #003366 y rojo #C41E3A como acentos
- **Sombras sutiles**: `shadow-md` y `shadow-lg` solo donde aportan profundidad
- **Tipografía Inter** con pesos 500-700 (legible pero con personalidad)
- **Bordes redondeados consistentes**: 8px para elementos pequeños, 12px para cards/botones

### 8. **UX de Cierre de Sesión Prominente pero No Agresiva**
- **Botón de logout fijo al final** con color secundario (rojo institucional)
- **Hover sutil**: Fondo con opacidad baja, no cambio brusco de color
- **Versión del sistema** opcional en el footer (placeholder v1.0.0)

---

## Decisiones Técnicas Clave

- **Signals de Angular 18+**: Reactividad nativa sin overhead de observables
- **Computed Signals**: Navegación y agrupación se recalculan automáticamente al cambiar rol
- **Click Outside nativo**: Cierre de dropdowns sin librerías externas (HostListener)
- **RouterLinkActive**: Estado activo automático incluso en rutas anidadas
- **CSS Variables locales**: Fácil cambio de tema (solo editar variables en `:host`)
- **Effect para scroll lock**: Bloquea scroll del body cuando drawer está abierto en mobile

---

## Estructura de Menú por Rol

### Estudiante
- Principal: Dashboard
- Académico: Cursos, Tareas, Notas, Asistencia
- Comunicación: Comunicados
- Cuenta: Perfil, Configuración

### Profesor
- Principal: Dashboard
- Académico: Cursos, Tareas, Notas, Asistencia
- Comunicación: Comunicados
- Cuenta: Perfil, Configuración

### Admin
- Principal: Dashboard
- Gestión de Usuarios: Usuarios, Estudiantes, Profesores, Padres
- Académico: Cursos, Reportes
- Cuenta: Perfil, Configuración

### Padre
- Principal: Dashboard
- Información del Hijo: Perfil Hijo
- Académico: Cursos, Tareas, Notas, Asistencia
- Comunicación: Comunicados, Mensajería
- Servicios: Pagos, Documentos
- Cuenta: Configuración

---

## Resultado Final

Un sidebar que:
- ✅ Se siente institucional pero moderno (no genérico)
- ✅ No compite con el contenido principal (colores y sombras sutiles)
- ✅ Funciona perfectamente en todos los dispositivos (responsive real)
- ✅ Es accesible para todos los usuarios (WCAG AA)
- ✅ Mantiene consistencia visual en toda la app (variables CSS)
- ✅ Ofrece feedback visual inmediato sin ser intrusivo (microinteracciones)
