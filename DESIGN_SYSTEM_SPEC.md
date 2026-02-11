# Portal SML - Design System & UI Specification

## 📋 Índice

1. [Design Tokens](#design-tokens)
2. [Componentes Base](#componentes-base)
3. [Guía por Vista](#guía-por-vista)
4. [Layout Rules & Breakpoints](#layout-rules--breakpoints)
5. [Estados de UI](#estados-de-ui)
6. [Accesibilidad](#accesibilidad)

---

## 🎨 Design Tokens

### Variables CSS (Design Tokens)

Todas las variables están definidas en `src/styles.scss` y soportan modo claro/oscuro.

#### Colores Institucionales

```css
--primary: #003366;              /* Azul institucional SML */
--primary-dark: #002244;
--primary-light: #004488;
--primary-contrast: #FFFFFF;

--secondary: #C41E3A;            /* Rojo institucional SML */
--secondary-dark: #A01A2E;
--secondary-light: #E0244A;
--secondary-contrast: #FFFFFF;
```

#### Estados Semánticos

```css
--success: #10B981;
--success-bg: #D1FAE5;
--success-text: #065F46;

--warning: #F59E0B;
--warning-bg: #FEF3C7;
--warning-text: #92400E;

--danger: #C41E3A;
--danger-bg: #FEE2E2;
--danger-text: #991B1B;

--info: #3B82F6;
--info-bg: #DBEAFE;
--info-text: #1E40AF;
```

#### Fondos (Light/Dark)

```css
/* Light Mode */
--bg: #F9FAFB;
--surface: #FFFFFF;
--surface-2: #F3F4F6;
--surface-elevated: #FFFFFF;

/* Dark Mode (aplicado con [data-theme="dark"]) */
--bg: #0F172A;
--surface: #1E293B;
--surface-2: #334155;
--surface-elevated: #334155;
```

#### Textos

```css
--text: #111827;                 /* Texto principal */
--text-muted: #6B7280;           /* Texto secundario */
--text-disabled: #9CA3AF;        /* Texto deshabilitado */
```

#### Tipografía

**Fuente:** Inter (Google Fonts)

**Tamaños:**
- `--font-size-xs`: 0.75rem (12px)
- `--font-size-sm`: 0.875rem (14px)
- `--font-size-base`: 1rem (16px)
- `--font-size-lg`: 1.125rem (18px)
- `--font-size-xl`: 1.25rem (20px)
- `--font-size-2xl`: 1.5rem (24px)
- `--font-size-3xl`: 1.875rem (30px)
- `--font-size-4xl`: 2.25rem (36px)

**Pesos:**
- `--font-weight-normal`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700

**Line Heights:**
- `--line-height-tight`: 1.2
- `--line-height-normal`: 1.5
- `--line-height-relaxed`: 1.75

#### Espaciado (Escala 4/8/12/16/24/32)

```css
--spacing-0: 0;
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-12: 3rem;     /* 48px */
--spacing-16: 4rem;     /* 64px */
--spacing-20: 5rem;     /* 80px */
--spacing-24: 6rem;     /* 96px */
```

#### Bordes Redondeados

```css
--radius-sm: 0.375rem;   /* 6px */
--radius: 0.5rem;        /* 8px */
--radius-md: 0.75rem;    /* 12px */
--radius-lg: 1rem;       /* 16px */
--radius-full: 9999px;
```

#### Sombras

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

#### Transiciones

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🧩 Componentes Base

### 1. PageHeaderComponent

**Ubicación:** `src/app/shared/components/page-header/`

**Props:**
- `title: string` - Título principal
- `subtitle?: string` - Subtítulo opcional
- `breadcrumbs?: Breadcrumb[]` - Array de breadcrumbs
- `actions?: Action[]` - Botones de acción en el header

**Ejemplo:**
```typescript
<app-page-header
  title="Dashboard"
  subtitle="Resumen académico del período actual"
  [breadcrumbs]="[
    { label: 'Inicio', route: '/dashboard' },
    { label: 'Cursos', route: '/cursos' }
  ]"
  [actions]="[
    { label: 'Nuevo', icon: 'fas fa-plus', variant: 'primary', action: () => {} }
  ]">
</app-page-header>
```

### 2. StatCardComponent

**Ubicación:** `src/app/shared/components/stat-card/`

**Props:**
- `label: string` - Etiqueta del KPI
- `value: string | number` - Valor principal
- `icon?: string` - Icono Font Awesome
- `trend?: { direction: 'up' | 'down' | 'neutral', value: string, label?: string }`
- `action?: { label: string, route?: string, action?: () => void }`
- `progress?: number` - Progreso 0-100
- `color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'`

**Ejemplo:**
```typescript
<app-stat-card
  label="Promedio General"
  [value]="16.5"
  icon="fas fa-chart-line"
  [trend]="{ direction: 'up', value: '+0.5', label: 'vs período anterior' }"
  color="primary">
</app-stat-card>
```

### 3. DataCardComponent

**Ubicación:** `src/app/shared/components/data-card/`

**Props:**
- `title?: string`
- `subtitle?: string`
- `icon?: string`
- `actions?: Action[]`
- `loading?: boolean`
- `empty?: boolean`
- `emptyMessage?: string`

**Ejemplo:**
```typescript
<app-data-card
  title="Actividad Reciente"
  subtitle="Últimas acciones en el sistema"
  icon="fas fa-clock">
  <!-- Contenido proyectado -->
</app-data-card>
```

### 4. BadgeComponent

**Ubicación:** `src/app/shared/components/badge/`

**Props:**
- `label: string`
- `variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary'`
- `size?: 'sm' | 'md' | 'lg'`
- `icon?: string`
- `dot?: boolean`

**Ejemplo:**
```typescript
<app-badge label="Pendiente" variant="warning" size="md"></app-badge>
<app-badge label="Entregada" variant="success" dot></app-badge>
```

### 5. TabsComponent

**Ubicación:** `src/app/shared/components/tabs/`

**Props:**
- `tabs: Tab[]` - Array de pestañas
- `activeTab: string` - ID de pestaña activa
- `tabChange: EventEmitter<string>` - Evento al cambiar pestaña

**Ejemplo:**
```typescript
<app-tabs
  [tabs]="[
    { id: 'contenido', label: 'Contenido', icon: 'fas fa-book' },
    { id: 'tareas', label: 'Tareas', icon: 'fas fa-tasks', badge: 5 },
    { id: 'calificaciones', label: 'Calificaciones', icon: 'fas fa-chart-line' }
  ]"
  [activeTab]="activeTab"
  (tabChange)="onTabChange($event)">
</app-tabs>
```

### 6. EmptyStateComponent

**Ubicación:** `src/app/shared/components/empty-state/`

**Props:**
- `icon?: string`
- `title: string`
- `description?: string`
- `action?: { label: string, route?: string, action?: () => void, variant?: 'primary' | 'secondary' | 'ghost' }`

**Ejemplo:**
```typescript
<app-empty-state
  icon="fas fa-inbox"
  title="No hay tareas"
  description="No tienes tareas pendientes en este momento"
  [action]="{ label: 'Ver todas las tareas', route: '/tareas', variant: 'primary' }">
</app-empty-state>
```

### 7. SkeletonComponent

**Ubicación:** `src/app/shared/components/skeleton/`

**Props:**
- `width?: string`
- `height?: string`
- `variant?: 'text' | 'circular' | 'rectangular'`
- `lines?: number` - Para variant="text"

**Ejemplo:**
```typescript
<app-skeleton width="100%" height="2rem" variant="rectangular"></app-skeleton>
<app-skeleton [lines]="3" variant="text"></app-skeleton>
```

### 8. TableListComponent

**Ubicación:** `src/app/shared/components/table-list/`

**Props:**
- `columns: TableColumn[]`
- `rows: TableRow[]`
- `loading?: boolean`
- `emptyMessage?: string`
- `clickable?: boolean`
- `onRowClick?: (row: TableRow) => void`

**Ejemplo:**
```typescript
<app-table-list
  [columns]="[
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'promedio', label: 'Promedio', sortable: true }
  ]"
  [rows]="cursos"
  [loading]="loading"
  [clickable]="true"
  (onRowClick)="verDetalle($event)">
</app-table-list>
```

### 9. FiltersBarComponent

**Ubicación:** `src/app/shared/components/filters-bar/`

**Props:**
- `searchPlaceholder: string`
- `searchValue: string`
- `chips?: FilterChip[]`
- `selects?: FilterSelect[]`
- `searchChange: EventEmitter<string>`
- `chipToggle: EventEmitter<string>`
- `selectChange: EventEmitter<{ id: string, value: string }>`

**Ejemplo:**
```typescript
<app-filters-bar
  searchPlaceholder="Buscar cursos..."
  [searchValue]="searchQuery"
  [chips]="[
    { id: 'activos', label: 'Activos', active: true },
    { id: 'finalizados', label: 'Finalizados', active: false }
  ]"
  [selects]="[
    { id: 'periodo', label: 'Período', options: periodos, value: selectedPeriodo }
  ]"
  (searchChange)="onSearch($event)"
  (chipToggle)="onChipToggle($event)"
  (selectChange)="onSelectChange($event)">
</app-filters-bar>
```

---

## 📐 Layout Rules & Breakpoints

### App Shell

```
┌─────────────────────────────────────────┐
│  Sidebar (NavbarComponent)             │
│  ┌───────────────────────────────────┐  │
│  │  Top Header (PageHeaderComponent) │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │  Content Area                     │  │
│  │  (Vista específica)               │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Grid System

- **Desktop (≥1024px):** Máximo 4 columnas
- **Tablet (768px-1023px):** Máximo 2 columnas
- **Mobile (<768px):** 1 columna

### Spacing Rules

- **Entre secciones:** `--spacing-8` (32px)
- **Entre cards en grid:** `--spacing-6` (24px)
- **Padding interno de cards:** `--spacing-6` (24px)
- **Padding de página:** `--spacing-4` (16px) en mobile, `--spacing-6` (24px) en desktop

---

## 🎯 Guía por Vista

### 1. Dashboard (`/dashboard`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader (Bienvenido + Fecha)       │
├─────────────────────────────────────────┤
│  Alertas (si hay)                      │
├─────────────────────────────────────────┤
│  KPIs Grid (4 StatCards)               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Promed│ │Tareas│ │Asist.│ │Eval. │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
├─────────────────────────────────────────┤
│  Accesos Rápidos (Grid 3 cols)         │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │Cursos│ │Tareas│ │Notas │            │
│  └──────┘ └──────┘ └──────┘            │
├─────────────────────────────────────────┤
│  Actividad Reciente (DataCard)         │
│  - Timeline limpia                     │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `StatCardComponent` (4x)
- `DataCardComponent` (Accesos rápidos, Actividad)
- `BadgeComponent` (contadores)

**Estados:**
- Loading: Skeletons en lugar de StatCards
- Empty: EmptyState en Actividad Reciente si no hay

### 2. Cursos (`/cursos`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader + Acción "Ver todos"       │
├─────────────────────────────────────────┤
│  FiltersBar (búsqueda + chips + select)│
├─────────────────────────────────────────┤
│  Grid de Cards de Cursos (3 cols)      │
│  ┌──────────┐ ┌──────────┐            │
│  │  Curso   │ │  Curso   │            │
│  │  Profesor│ │  Profesor│            │
│  │  Promedio│ │  Promedio│            │
│  └──────────┘ └──────────┘            │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `FiltersBarComponent`
- `DataCardComponent` (cada curso)
- `BadgeComponent` (estado, pendientes)

**Estados:**
- Loading: Grid de Skeletons
- Empty: EmptyState con acción "Crear curso" (si aplica)

### 3. Detalle de Curso (`/cursos/:id`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader (Info curso + acciones)     │
├─────────────────────────────────────────┤
│  Tabs (Contenido | Tareas | Calific.)   │
├─────────────────────────────────────────┤
│  Tab Content:                            │
│  - Contenido: Accordion de unidades     │
│  - Tareas: TableList con badges         │
│  - Calificaciones: Tabla + resumen     │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `TabsComponent`
- `DataCardComponent` (unidades)
- `TableListComponent` (tareas, calificaciones)
- `BadgeComponent` (estados)

### 4. Tareas (`/tareas`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader                             │
├─────────────────────────────────────────┤
│  Contadores (StatCards 3x)              │
│  Pendientes | Vencidas | Completadas    │
├─────────────────────────────────────────┤
│  FiltersBar (chips de estado + búsqueda)│
├─────────────────────────────────────────┤
│  TableList (tareas ordenadas)           │
│  - Vencidas primero (prioridad visual) │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `StatCardComponent` (3x contadores)
- `FiltersBarComponent`
- `TableListComponent`
- `BadgeComponent` (estados)

### 5. Detalle de Tarea (`/tareas/:id`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader (Título tarea)              │
├─────────────────────────────────────────┤
│  DataCard Principal:                    │
│  - Descripción                          │
│  - Fecha límite                         │
│  - Puntos                               │
│  - Estado                               │
├─────────────────────────────────────────┤
│  Sección Entrega:                       │
│  - Uploader elegante                    │
│  - Lista de archivos                    │
│  - Botón confirmar                      │
├─────────────────────────────────────────┤
│  Sección Calificación (si hay):         │
│  - Puntos obtenidos                     │
│  - Feedback del profesor                │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `DataCardComponent`
- `BadgeComponent`

### 6. Notas (`/notas`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader                             │
├─────────────────────────────────────────┤
│  StatCard (Promedio General)            │
├─────────────────────────────────────────┤
│  FiltersBar (período + curso)           │
├─────────────────────────────────────────┤
│  TableList (calificaciones)             │
│  Columnas: Tipo | Fecha | Puntos | %    │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `StatCardComponent`
- `FiltersBarComponent`
- `TableListComponent`

### 7. Asistencia (`/asistencia`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader                             │
├─────────────────────────────────────────┤
│  StatCards (3x):                        │
│  Porcentaje | Faltas | Tardanzas        │
├─────────────────────────────────────────┤
│  FiltersBar (mes + curso)               │
├─────────────────────────────────────────┤
│  TableList (registro diario)            │
│  - Badges por estado                    │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `StatCardComponent` (3x)
- `FiltersBarComponent`
- `TableListComponent`
- `BadgeComponent`

### 8. Comunicados (`/comunicados`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader                             │
├─────────────────────────────────────────┤
│  FiltersBar (tipo + urgente + búsqueda) │
├─────────────────────────────────────────┤
│  Lista de Comunicados:                  │
│  - Card con estado leído/no leído       │
│  - Badge urgente destacado              │
│  - Fecha + emisor                       │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `FiltersBarComponent`
- `DataCardComponent` (cada comunicado)
- `BadgeComponent` (urgente, leído)

### 9. Detalle Comunicado (`/comunicados/:id`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader (Título + metadata)         │
├─────────────────────────────────────────┤
│  DataCard:                              │
│  - Cuerpo (tipografía cómoda)           │
│  - Adjuntos (lista limpia)              │
│  - Botón "Marcar como leído"            │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `DataCardComponent`

### 10. Perfil (`/perfil`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader                             │
├─────────────────────────────────────────┤
│  Tabs (Personal | Académico | Foto)    │
├─────────────────────────────────────────┤
│  Tab Content:                            │
│  - Formulario 2 columnas (desktop)      │
│  - 1 columna (mobile)                   │
│  - Uploader de foto simple              │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `TabsComponent`
- `DataCardComponent` (formularios)

### 11. Configuración (`/configuracion`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader                             │
├─────────────────────────────────────────┤
│  Tabs (Cuenta | Preferencias | Notif.)  │
├─────────────────────────────────────────┤
│  Tab Content:                            │
│  - Cuenta: Cambio contraseña (validación)│
│  - Preferencias: Tema, idioma, fecha    │
│  - Notificaciones: Toggles por tipo      │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `TabsComponent`
- `DataCardComponent`

### 12. Mensajería de Curso (`/cursos/:id/mensajeria`)

**Estructura:**
```
┌─────────────────────────────────────────┐
│  PageHeader (Título curso)              │
├─────────────────────────────────────────┤
│  Layout 2 columnas (desktop):           │
│  ┌──────────┬──────────────────────┐  │
│  │ Lista     │ Panel conversación   │  │
│  │ conversac.│                      │  │
│  │           │ - Burbujas sobrias  │  │
│  │           │ - Timestamps         │  │
│  │           │ - Adjuntos           │  │
│  │           │ - Input fijo abajo    │  │
│  └──────────┴──────────────────────┘  │
│  Mobile: Navegación tipo "back"         │
└─────────────────────────────────────────┘
```

**Componentes:**
- `PageHeaderComponent`
- `DataCardComponent` (mensajes)

---

## 🔄 Estados de UI

### Loading State

**Cuándo usar:**
- Carga inicial de datos
- Refresco de datos
- Operaciones asíncronas

**Implementación:**
```typescript
@if (loading) {
  <app-skeleton [lines]="5" variant="text"></app-skeleton>
} @else {
  <!-- Contenido real -->
}
```

### Empty State

**Cuándo usar:**
- Lista vacía
- Sin resultados de búsqueda
- Primera vez del usuario

**Implementación:**
```typescript
@if (items.length === 0) {
  <app-empty-state
    icon="fas fa-inbox"
    title="No hay elementos"
    description="Descripción útil para el usuario"
    [action]="{ label: 'Acción sugerida', route: '/ruta' }">
  </app-empty-state>
}
```

### Error State

**Cuándo usar:**
- Error de red
- Error de servidor
- Error de validación

**Implementación:**
```typescript
@if (error) {
  <div class="error-state">
    <i class="fas fa-exclamation-circle"></i>
    <h3>Error al cargar</h3>
    <p>{{ error.message }}</p>
    <button class="btn btn-primary" (click)="retry()">Reintentar</button>
  </div>
}
```

---

## ♿ Accesibilidad

### Requisitos Mínimos

1. **Focus Visible:**
   - Todos los elementos interactivos tienen outline visible
   - Color: `var(--border-focus)`
   - Offset: 2px

2. **Contraste:**
   - Texto sobre fondo: mínimo 4.5:1
   - Texto grande: mínimo 3:1
   - Elementos no textuales: mínimo 3:1

3. **Tamaños Táctiles:**
   - Mínimo 44x44px en mobile
   - Espaciado entre elementos: mínimo 8px

4. **ARIA Labels:**
   - Todos los iconos decorativos: `aria-hidden="true"`
   - Botones sin texto: `aria-label`
   - Navegación: `role="navigation"`, `aria-label`
   - Tabs: `role="tablist"`, `role="tab"`, `aria-selected`

5. **Reduced Motion:**
   - Respetar `prefers-reduced-motion`
   - Desactivar animaciones si el usuario lo prefiere

### Ejemplo de Implementación

```typescript
<button
  type="button"
  class="btn btn-primary"
  [attr.aria-label]="'Abrir menú'"
  (click)="openMenu()">
  <i class="fas fa-bars" aria-hidden="true"></i>
</button>
```

---

## ✅ Checklist Final

### Design System
- [x] Variables CSS completas (claro/oscuro)
- [x] Tipografía Inter configurada
- [x] Escala de espaciado consistente
- [x] Paleta de colores institucional

### Componentes Base
- [x] PageHeaderComponent
- [x] StatCardComponent
- [x] DataCardComponent
- [x] BadgeComponent
- [x] TabsComponent
- [x] EmptyStateComponent
- [x] SkeletonComponent
- [x] TableListComponent
- [x] FiltersBarComponent

### Estilos Base
- [x] Botones (primary, secondary, ghost)
- [x] Focus visible
- [x] Transiciones consistentes
- [x] Responsive helpers

### Accesibilidad
- [x] Focus visible en todos los elementos
- [x] ARIA labels donde aplica
- [x] Contraste correcto
- [x] Tamaños táctiles en mobile
- [x] Soporte para reduced motion

---

**Última actualización:** 2024
**Versión:** 1.0.0
