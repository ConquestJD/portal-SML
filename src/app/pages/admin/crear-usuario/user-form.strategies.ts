import { Observable } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { RoleKind, roleListPath, roleListLabel, roleSingularLabel } from '../_shared/models/role.model';

export type FieldKey =
  | 'firstName' | 'lastName' | 'username' | 'email' | 'password' | 'phone' | 'dni' | 'address' | 'status'
  // student
  | 'level' | 'grade' | 'studentCode' | 'birthDate' | 'gender' | 'bloodType' | 'medicalNotes' | 'emergencyPhone'
  // teacher
  | 'department' | 'specialization' | 'degree' | 'university' | 'teacherCode' | 'specialty' | 'bio'
  // parent
  | 'relationship' | 'occupation';

/**
 * Shape del formulario completo (unificado para todos los roles).
 * Cada strategy decide qué campos se muestran y cómo se mapean a DTOs.
 */
export interface UserFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  dni: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  // student
  level: string;
  grade: string;
  studentCode: string;
  birthDate: string;
  gender: string;
  bloodType: string;
  medicalNotes: string;
  emergencyPhone: string;
  // teacher
  department: string;
  specialization: string;
  degree: string;
  university: string;
  teacherCode: string;
  specialty: string;
  bio: string;
  // parent
  relationship: string;
  occupation: string;
}

export function emptyFormData(): UserFormData {
  return {
    firstName: '', lastName: '', username: '', email: '', password: '', phone: '', dni: '', address: '', status: 'ACTIVE',
    level: '', grade: '', studentCode: '', birthDate: '', gender: '', bloodType: '', medicalNotes: '', emergencyPhone: '',
    department: '', specialization: '', degree: '', university: '', teacherCode: '', specialty: '', bio: '',
    relationship: '', occupation: '',
  };
}

/**
 * Normaliza el DNI a solo dígitos.
 * En alumnos, profesores, padres y administradores es la contraseña inicial.
 */
export function usernameFromDni(dni: string): string {
  return (dni || '').replace(/\D/g, '');
}

/** Ejemplo de código de acceso de alumno: s + año + correlativo (s2026001). */
export function studentAccessCodeExample(year = new Date().getFullYear()): string {
  return `s${year}001`;
}

export interface UserFormStrategy {
  kind: RoleKind;
  listPath: string;
  listLabel: string;
  singular: string;
  /** Título secundario en el form */
  subtitle: string;
  /** Campos específicos del rol que se muestran en la sección "Información del rol" */
  roleFields: FieldKey[];
  /** Devuelve true si el rol requiere credenciales en creación (en inicial para estudiantes no se requiere) */
  requiresCredentials: (data: UserFormData, isEditMode: boolean) => boolean;
  /** Construye el DTO para creación */
  buildCreateDto: (d: UserFormData) => Record<string, unknown>;
  /** Llama al endpoint de creación */
  create: (svc: AdminService, dto: Record<string, unknown>) => Observable<unknown>;
  /** Mensaje de éxito */
  successMessage: string;
}

export const STUDENT_STRATEGY: UserFormStrategy = {
  kind: 'student',
  listPath: roleListPath('student'),
  listLabel: roleListLabel('student'),
  singular: roleSingularLabel('student'),
  subtitle: 'Información académica y personal del estudiante',
  /** Campos médicos y código de estudiante se omiten del alta a pedido del colegio. */
  roleFields: ['level', 'grade', 'birthDate', 'gender', 'dni', 'emergencyPhone', 'address'],
  /** En alta la contraseña es el DNI (backend). En edición solo si se escribe una nueva. */
  requiresCredentials: (d, isEditMode) => isEditMode ? !!d.password : false,
  buildCreateDto: (d) => ({
    email: d.email || undefined,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    birthDate: d.birthDate || undefined,
    gender: d.gender || undefined,
    address: d.address || undefined,
    dni: usernameFromDni(d.dni) || d.dni,
    grade: d.grade || undefined,
    level: d.level ? (d.level.charAt(0).toUpperCase() + d.level.slice(1)) : undefined,
  }),
  create: (svc, dto) => svc.createStudent(dto as never),
  successMessage: 'Estudiante creado correctamente',
};

export const TEACHER_STRATEGY: UserFormStrategy = {
  kind: 'teacher',
  listPath: roleListPath('teacher'),
  listLabel: roleListLabel('teacher'),
  singular: roleSingularLabel('teacher'),
  subtitle: 'Identidad, acceso y datos profesionales del docente',
  /**
   * El correo es el usuario de acceso. El DNI (solo dígitos) es la contraseña inicial.
   * `username`/`password` los ignora el backend.
   */
  roleFields: ['dni'],
  requiresCredentials: (_d, isEditMode) => isEditMode ? !!_d.password : false,
  buildCreateDto: (d) => ({
    email: d.email.trim(),
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    dni: usernameFromDni(d.dni) || d.dni,
    teacherCode: d.teacherCode || undefined,
    bio: d.bio || undefined,
  }),
  create: (svc, dto) => svc.createTeacher(dto as never),
  successMessage: 'Profesor creado correctamente',
};

export const PARENT_STRATEGY: UserFormStrategy = {
  kind: 'parent',
  listPath: roleListPath('parent'),
  listLabel: roleListLabel('parent'),
  singular: roleSingularLabel('parent'),
  subtitle: 'Información personal y de contacto del apoderado',
  /**
   * El correo es el usuario de acceso. El DNI (solo dígitos) es la contraseña inicial.
   * `username`/`password` los ignora el backend.
   */
  roleFields: ['relationship', 'occupation', 'dni'],
  requiresCredentials: (_d, isEditMode) => isEditMode ? !!_d.password : false,
  buildCreateDto: (d) => ({
    email: d.email.trim(),
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    dni: usernameFromDni(d.dni) || d.dni,
    relationship: d.relationship || undefined,
    occupation: d.occupation || undefined,
  }),
  create: (svc, dto) => svc.createParent(dto as never),
  successMessage: 'Apoderado creado correctamente',
};

export const ADMIN_STRATEGY: UserFormStrategy = {
  kind: 'admin',
  listPath: roleListPath('admin'),
  listLabel: roleListLabel('admin'),
  singular: roleSingularLabel('admin'),
  subtitle: 'Cuenta de administrador del sistema',
  roleFields: ['dni', 'address'],
  requiresCredentials: (_d, isEditMode) => isEditMode ? !!_d.password : false,
  buildCreateDto: (d) => ({
    email: d.email.trim(),
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    role: 'ADMIN',
    dni: usernameFromDni(d.dni) || d.dni,
  }),
  create: (svc, dto) => svc.createUser(dto as never),
  successMessage: 'Usuario creado correctamente',
};

export const USER_FORM_STRATEGIES: Record<RoleKind, UserFormStrategy> = {
  student: STUDENT_STRATEGY,
  teacher: TEACHER_STRATEGY,
  parent: PARENT_STRATEGY,
  admin: ADMIN_STRATEGY,
};
