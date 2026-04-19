/**
 * Modelos y mappers centralizados para el módulo de admin.
 * Fuente única de verdad para roles, estados y etiquetas.
 */

export type RoleKind = 'student' | 'teacher' | 'parent' | 'admin';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type LegacyUserStatus = 'activo' | 'inactivo' | 'suspendido' | 'retirado';

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
export type EnrollmentStatus = 'ACTIVE' | 'WITHDRAWN' | 'TRANSFERRED' | 'COMPLETED';

/** Convierte el nombre API del rol a su RoleKind interno */
export function apiRoleToKind(apiRole: string | undefined): RoleKind | null {
  switch ((apiRole ?? '').toUpperCase()) {
    case 'STUDENT': return 'student';
    case 'TEACHER': return 'teacher';
    case 'PARENT': return 'parent';
    case 'ADMIN': return 'admin';
    default: return null;
  }
}

export function kindToApiRole(kind: RoleKind): string {
  return kind === 'student' ? 'STUDENT'
    : kind === 'teacher' ? 'TEACHER'
    : kind === 'parent'  ? 'PARENT'
    : 'ADMIN';
}

/** Etiqueta legible en español para un RoleKind */
export function roleLabel(kind: RoleKind | string | null | undefined): string {
  if (!kind) return '';
  const k = typeof kind === 'string' ? (apiRoleToKind(kind) ?? kind) : kind;
  switch (k) {
    case 'student': return 'Estudiante';
    case 'teacher': return 'Profesor';
    case 'parent':  return 'Padre de familia';
    case 'admin':   return 'Administrador';
    default:        return String(k);
  }
}

/** Rutas del listado que corresponde a cada rol */
export function roleListPath(kind: RoleKind): string {
  switch (kind) {
    case 'student': return '/admin/estudiantes';
    case 'teacher': return '/admin/profesores';
    case 'parent':  return '/admin/padres';
    case 'admin':   return '/admin/usuarios';
  }
}

/** Etiqueta del listado (para breadcrumbs y botones "Volver a ...") */
export function roleListLabel(kind: RoleKind): string {
  switch (kind) {
    case 'student': return 'Estudiantes';
    case 'teacher': return 'Profesores';
    case 'parent':  return 'Padres de familia';
    case 'admin':   return 'Usuarios';
  }
}

/** Etiqueta en singular para títulos de creación ("Nuevo X") */
export function roleSingularLabel(kind: RoleKind): string {
  switch (kind) {
    case 'student': return 'Estudiante';
    case 'teacher': return 'Profesor';
    case 'parent':  return 'Padre de familia';
    case 'admin':   return 'Administrador';
  }
}

// ─── STATUS ──────────────────────────────────────────────────────────────────

const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
  activo: 'Activo',
  inactivo: 'Inactivo',
  suspendido: 'Suspendido',
  retirado: 'Retirado',
};

const USER_STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-secondary',
  SUSPENDED: 'badge-error',
  activo: 'badge-success',
  inactivo: 'badge-secondary',
  suspendido: 'badge-error',
  retirado: 'badge-secondary',
};

export function userStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return USER_STATUS_LABEL[status] ?? status;
}

export function userStatusBadgeClass(status: string | null | undefined): string {
  if (!status) return 'badge-secondary';
  return USER_STATUS_CLASS[status] ?? 'badge-secondary';
}

/** Convierte estados legacy (lowercase español) al formato API */
export function normalizeUserStatus(status: string | undefined): UserStatus | undefined {
  if (!status) return undefined;
  const map: Record<string, UserStatus> = {
    activo: 'ACTIVE', ACTIVE: 'ACTIVE',
    inactivo: 'INACTIVE', INACTIVE: 'INACTIVE',
    suspendido: 'SUSPENDED', SUSPENDED: 'SUSPENDED',
  };
  return map[status];
}

// ─── PAYMENT STATUS ──────────────────────────────────────────────────────────

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado', PENDING: 'Pendiente', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
};
const PAYMENT_STATUS_CLASS: Record<string, string> = {
  PAID: 'badge-success', PENDING: 'badge-warning', OVERDUE: 'badge-error', CANCELLED: 'badge-secondary',
};

export function paymentStatusLabel(s: string | null | undefined): string {
  return s ? (PAYMENT_STATUS_LABEL[s] ?? s) : '—';
}
export function paymentStatusBadgeClass(s: string | null | undefined): string {
  return s ? (PAYMENT_STATUS_CLASS[s] ?? 'badge-secondary') : 'badge-secondary';
}

// ─── ENROLLMENT STATUS ───────────────────────────────────────────────────────

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Matriculado', WITHDRAWN: 'Retirado', TRANSFERRED: 'Trasladado', COMPLETED: 'Completado',
};
export function enrollmentStatusLabel(s: string | null | undefined): string {
  if (!s) return 'Sin matrícula';
  return ENROLLMENT_STATUS_LABEL[s] ?? s;
}

// ─── RELATIONSHIP ────────────────────────────────────────────────────────────

const RELATIONSHIP_LABEL: Record<string, string> = {
  Padre: 'Padre', Madre: 'Madre', Tutor: 'Tutor',
  Abuelo: 'Abuelo', Abuela: 'Abuela', Tío: 'Tío', Tía: 'Tía', Apoderado: 'Apoderado',
};
export function relationshipLabel(rel: string | null | undefined): string {
  if (!rel) return 'Apoderado';
  return RELATIONSHIP_LABEL[rel] ?? rel;
}

// ─── LEVEL ───────────────────────────────────────────────────────────────────

export function levelLabel(level: string | null | undefined): string {
  if (!level) return '';
  const map: Record<string, string> = {
    inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria',
    Inicial: 'Inicial', Primaria: 'Primaria', Secundaria: 'Secundaria',
  };
  return map[level] ?? level;
}
