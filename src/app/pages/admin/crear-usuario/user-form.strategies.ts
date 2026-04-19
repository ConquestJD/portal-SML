import { Observable } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { RoleKind, roleListPath, roleListLabel, roleSingularLabel } from '../_shared/models/role.model';

export type FieldKey =
  | 'firstName' | 'lastName' | 'email' | 'password' | 'phone' | 'dni' | 'address' | 'status'
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
    firstName: '', lastName: '', email: '', password: '', phone: '', dni: '', address: '', status: 'ACTIVE',
    level: '', grade: '', studentCode: '', birthDate: '', gender: '', bloodType: '', medicalNotes: '', emergencyPhone: '',
    department: '', specialization: '', degree: '', university: '', teacherCode: '', specialty: '', bio: '',
    relationship: '', occupation: '',
  };
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
  /** Campo del formulario que se debe rellenar como "username" automático cuando aplique */
  autoUsername?: boolean;
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
  roleFields: ['level', 'grade', 'studentCode', 'birthDate', 'gender', 'bloodType', 'medicalNotes', 'dni', 'emergencyPhone', 'address'],
  requiresCredentials: (d, isEditMode) => isEditMode ? !!d.password : d.level !== 'inicial',
  buildCreateDto: (d) => ({
    email: d.email,
    password: d.password,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    studentCode: d.studentCode || undefined,
    birthDate: d.birthDate || undefined,
    gender: d.gender || undefined,
    address: d.address || undefined,
    bloodType: d.bloodType || undefined,
    medicalNotes: d.medicalNotes || undefined,
    dni: d.dni || undefined,
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
  subtitle: 'Información profesional y personal del docente',
  roleFields: ['department', 'specialization', 'degree', 'university', 'teacherCode', 'dni', 'address'],
  requiresCredentials: () => true,
  buildCreateDto: (d) => ({
    email: d.email,
    password: d.password,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    teacherCode: d.teacherCode || undefined,
    specialty: d.specialization || d.specialty || undefined,
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
  roleFields: ['relationship', 'occupation', 'dni', 'address'],
  requiresCredentials: () => true,
  buildCreateDto: (d) => ({
    email: d.email,
    password: d.password,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
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
  requiresCredentials: () => true,
  buildCreateDto: (d) => ({
    email: d.email,
    password: d.password,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || undefined,
    role: 'ADMIN',
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
