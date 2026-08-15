import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PageMeta {
  page: number; pageSize: number; total: number; totalPages: number;
}

function buildParams(filters: Record<string, string | number | boolean | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

// ─── USERS ───────────────────────────────────────────────────────────────────
export interface UserItem {
  id: string; username?: string; email: string; firstName: string; lastName: string;
  dni?: string;
  name?: string;
  role: { name: string };
  displayRole?: string;
  status: string;
  displayStatus?: string;
  phone?: string; createdAt?: string;
}
export interface CreateUserDto {
  username?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  dni: string;
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────
export interface StudentItem {
  id: string; studentCode: string;
  user: {
    id: string; email: string; firstName: string; lastName: string; status: string;
    phone?: string; username?: string; dni?: string; address?: string; createdAt?: string;
  };
  birthDate?: string; gender?: string; address?: string; bloodType?: string; medicalNotes?: string;
  createdAt?: string;
  // Normalized display fields
  name?: string; code?: string; email?: string; phone?: string; status?: string;
  grade?: string; level?: string; section?: string;
  dni?: string; emergencyPhone?: string; username?: string; tutor?: string;
}
export interface CreateStudentDto {
  username?: string;
  email?: string; password?: string; firstName: string; lastName: string;
  phone?: string; studentCode?: string; birthDate?: string; gender?: string;
  address?: string; bloodType?: string; medicalNotes?: string; dni: string;
  grade?: string; level?: string;
}

// ─── TEACHERS ────────────────────────────────────────────────────────────────
export interface TeacherItem {
  id: string; teacherCode?: string; bio?: string;
  user: {
    id: string; email: string; firstName: string; lastName: string; status: string;
    phone?: string; username?: string; dni?: string; address?: string; createdAt?: string;
  };
  createdAt?: string;
  // Campos normalizados para templates
  name?: string; email?: string; phone?: string; status?: string;
  username?: string; dni?: string; address?: string;
  department?: string; courses?: number; students?: number; grades?: string[];
}
/** Cuerpo esperado por `POST /teachers`. Usuario = correo; contraseña = DNI. */
export interface CreateTeacherDto {
  username?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone?: string;
  teacherCode?: string; bio?: string;
}

// ─── PARENTS ─────────────────────────────────────────────────────────────────
export interface ParentItem {
  id: string; relationship?: string; occupation?: string;
  user: {
    id: string; email: string; firstName: string; lastName: string; status: string;
    phone?: string; username?: string; dni?: string; address?: string; createdAt?: string;
  };
  createdAt?: string;
  // Campos normalizados para templates
  name?: string; email?: string; phone?: string; status?: string; dni?: string; address?: string;
  username?: string;
  children?: number; childrenList?: { id: string; name: string; grade: string }[];
}
export interface CreateParentDto {
  username?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dni: string;
  relationship?: string;
  occupation?: string;
}

// ─── COURSES ─────────────────────────────────────────────────────────────────
export interface ScheduleSlot {
  day: string;        // 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado'
  startTime: string;  // 'HH:mm'
  endTime: string;    // 'HH:mm'
}

export interface CourseItem {
  id: string; name: string; code: string; description?: string;
  grade?: string; level?: string; hours?: number; status: string;
  classroom?: string; students?: number;
  schedule?: ScheduleSlot[];
  color?: string;
}
export interface CreateCourseDto {
  name: string; code: string; description?: string; grade?: string; level?: string; hours?: number;
  schedule?: ScheduleSlot[];
  color?: string;
}

// ─── SECTIONS ────────────────────────────────────────────────────────────────
export interface SectionItem {
  id: string; name: string; grade: string; level: string; capacity: number;
  academicYear: { id: string; name: string }; enrolledCount?: number;
}
export interface CreateSectionDto {
  name: string; grade: string; level: string; academicYearId: string; capacity: number;
}

// ─── ACADEMIC YEARS ──────────────────────────────────────────────────────────
export interface AcademicYearItem {
  id: string; name: string; year?: string; startDate: string; endDate: string; status: string;
  periods?: AcademicPeriod[];
}
export interface AcademicPeriod { id: string; name: string; startDate: string; endDate: string; }
export interface CreateAcademicYearDto {
  name: string; startDate: string; endDate: string; status: string;
}

// ─── ENROLLMENTS ─────────────────────────────────────────────────────────────
export interface EnrollmentItem {
  id: string; status: string;
  student: { id: string; studentCode: string; user: { firstName: string; lastName: string } };
  section: { id: string; name: string; grade: string };
  academicYear: { id: string; name: string };
  grade?: string; // flat alias from section.grade
}
export interface CreateEnrollmentDto {
  studentId: string; sectionId: string; academicYearId: string;
}

// ─── STUDENT PAYMENTS ────────────────────────────────────────────────────────
export interface StudentPaymentItem {
  id: string;
  concept: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  category?: string;
  createdAt?: string;
}

export interface RegisterStudentPaymentDto {
  concept: string;
  amount: number;
  dueDate?: string;
  paidAt?: string;
  status?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  category?: string;
}

// ─── TEACHER ASSIGNMENTS ────────────────────────────────────────────────────
export interface AssignmentItem {
  id: string; isActive: boolean;
  teacher: { id: string; user: { firstName: string; lastName: string } };
  course: { id: string; name: string };
  section: { id: string; name: string; grade: string };
  academicYear: { id: string; name: string };
  grade?: string;
  students?: number;
}
export interface CreateAssignmentDto {
  teacherId: string; courseId: string; sectionId: string; academicYearId: string;
}

// ─── ROLES ───────────────────────────────────────────────────────────────────
export interface RoleItem {
  id: string; name: string; description?: string;
  permissions: { permission: { action: string } }[];
  userCount?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly url = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<{ success: boolean; data: T }>(`${this.url}${path}`, { params })
      .pipe(map((r: any) => r.data));
  }
  private getList<T>(path: string, params?: HttpParams): Observable<{ data: T[]; meta: PageMeta }> {
    return this.http.get<{ success: boolean; data: T[]; meta: PageMeta }>(`${this.url}${path}`, { params })
      .pipe(map(r => ({ data: r.data, meta: r.meta })));
  }

  private normalizeUser(u: UserItem): UserItem {
    const roleMap: Record<string, string> = { STUDENT: 'estudiante', TEACHER: 'profesor', ADMIN: 'admin', PARENT: 'padre' };
    const statusMap: Record<string, string> = { ACTIVE: 'activo', INACTIVE: 'inactivo', SUSPENDED: 'suspendido' };
    return {
      ...u,
      name: `${u.firstName} ${u.lastName}`,
      displayRole: roleMap[u.role?.name] ?? u.role?.name?.toLowerCase() ?? '',
      displayStatus: statusMap[u.status] ?? u.status?.toLowerCase() ?? '',
    };
  }

  getStudentById(id: string): Observable<StudentItem> {
    return this.http.get<{ success: boolean; data: StudentItem }>(`${this.url}/students/${id}`)
      .pipe(map(r => this.normalizeStudent(r.data)));
  }

  // ─── USERS ────────────────────────────────────────────────────────────────
  getUsers(f: { role?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    return this.getList<UserItem>('/users', buildParams(f)).pipe(
      map(r => ({ ...r, data: r.data.map(u => this.normalizeUser(u)) }))
    );
  }
  createUser(dto: CreateUserDto): Observable<UserItem> {
    return this.http.post<{ success: boolean; data: UserItem }>(`${this.url}/users`, dto).pipe(map(r => r.data));
  }
  updateUser(id: string, dto: Partial<CreateUserDto>): Observable<UserItem> {
    return this.http.put<{ success: boolean; data: UserItem }>(`${this.url}/users/${id}`, dto).pipe(map(r => r.data));
  }
  patchUserStatus(id: string, status: string): Observable<UserItem> {
    return this.http.patch<{ success: boolean; data: UserItem }>(`${this.url}/users/${id}/status`, { status }).pipe(map(r => r.data));
  }
  resetUserPassword(id: string): Observable<{ message: string; tempPassword: string }> {
    return this.http.post<{ success: boolean; data: { message: string; tempPassword: string } }>(`${this.url}/users/${id}/reset-password`, {}).pipe(map(r => r.data));
  }

  private normalizeStudent(s: StudentItem): StudentItem {
    const statusMap: Record<string, string> = { ACTIVE: 'activo', INACTIVE: 'retirado', SUSPENDED: 'suspendido' };
    const rawStatus = s.status ?? s.user?.status ?? '';
    const u = s.user ?? ({} as StudentItem['user']);
    return {
      ...s,
      name:     s.name  ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      code:     s.code  ?? s.studentCode ?? '',
      email:    s.email ?? u.email ?? '',
      phone:    s.phone ?? u.phone ?? '',
      username: s.username ?? u.username ?? '',
      dni:      s.dni ?? u.dni ?? '',
      address:  s.address ?? u.address ?? '',
      createdAt: s.createdAt ?? u.createdAt ?? '',
      status:   statusMap[rawStatus] ?? rawStatus.toLowerCase(),
      grade:    s.grade ?? '',
      level:    s.level ?? '',
    };
  }

  private normalizeTeacher(t: TeacherItem): TeacherItem {
    const u = t.user ?? ({} as TeacherItem['user']);
    const username = t.username ?? u.username ?? '';
    return {
      ...t,
      name:      t.name      ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      email:     t.email     ?? u.email     ?? '',
      phone:     t.phone     ?? u.phone     ?? '',
      status:    t.status    ?? u.status    ?? '',
      username,
      // El DNI no se persiste en `/teachers`; solo se infiere si el username es numérico (altas antiguas).
      dni:       t.dni ?? u.dni ?? (/^\d{8,}$/.test(username) ? username : ''),
      address:   t.address   ?? u.address   ?? '',
      createdAt: t.createdAt ?? u.createdAt ?? '',
      courses: t.courses ?? 0,
      students: t.students ?? 0,
      grades: t.grades ?? []
    };
  }

  private normalizeParent(p: ParentItem): ParentItem {
    const u = p.user ?? ({} as ParentItem['user']);
    const username = p.username ?? u.username ?? '';
    return {
      ...p,
      name:      p.name      ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      email:     p.email     ?? u.email     ?? '',
      phone:     p.phone     ?? u.phone     ?? '',
      status:    p.status    ?? u.status    ?? '',
      username,
      // El DNI no se persiste en `/parents`; solo se infiere si el username es numérico (altas antiguas).
      dni:       p.dni ?? u.dni ?? (/^\d{8,}$/.test(username) ? username : ''),
      address:   p.address   ?? u.address   ?? '',
      createdAt: p.createdAt ?? u.createdAt ?? '',
    };
  }

  // ─── STUDENTS ─────────────────────────────────────────────────────────────
  getStudents(f: { grade?: string; section?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    return this.getList<StudentItem>('/students', buildParams(f)).pipe(
      map(r => ({ ...r, data: r.data.map(s => this.normalizeStudent(s)) }))
    );
  }
  getStudent(id: string): Observable<StudentItem> {
    return this.get<StudentItem>(`/students/${id}`).pipe(map(s => this.normalizeStudent(s)));
  }
  createStudent(dto: CreateStudentDto): Observable<StudentItem> {
    return this.http.post<{ success: boolean; data: any }>(`${this.url}/students`, dto).pipe(
      map(r => {
        const d = r.data;
        // POST /students returns a User object with nested student record.
        // Normalize to StudentItem format so student.id is the student record ID.
        if (d.student?.id) {
          return {
            id: d.student.id,
            studentCode: d.student.studentCode ?? '',
            user: { id: d.id, email: d.email, firstName: d.firstName, lastName: d.lastName, status: d.status, phone: d.phone },
            ...d.student
          } as StudentItem;
        }
        return d as StudentItem;
      })
    );
  }
  updateStudent(id: string, dto: Partial<CreateStudentDto>): Observable<StudentItem> {
    return this.http.put<{ success: boolean; data: StudentItem }>(`${this.url}/students/${id}`, dto).pipe(map(r => r.data));
  }
  getStudentAcademicHistory(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/students/${id}/academic-history`); }
  getStudentGrades(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/students/${id}/grades`); }
  getStudentAttendance(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/students/${id}/attendance`); }
  getStudentParents(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/students/${id}/parents`); }
  linkParent(studentId: string, parentId: string, isPrimary = false): Observable<unknown> {
    return this.http.post(`${this.url}/students/${studentId}/parents`, { parentId, isPrimary });
  }
  unlinkParent(studentId: string, parentId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/students/${studentId}/parents/${parentId}`);
  }
  getStudentDocuments(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/students/${id}/documents`); }
  getStudentPayments(id: string, f: { status?: string } = {}): Observable<StudentPaymentItem[]> {
    return this.get<unknown[]>(`/students/${id}/parents`).pipe(
      switchMap((parents) => {
        const parentIds = parents
          .map((p: any) => p?.parentId ?? p?.id)
          .filter((pid: string | undefined): pid is string => !!pid);

        if (!parentIds.length) return of([]);

        return forkJoin(
          parentIds.map(parentId =>
            this.get<StudentPaymentItem[]>(`/parents/${parentId}/payments`, buildParams(f)).pipe(
              catchError(() => of([]))
            )
          )
        ).pipe(
          map((paymentsByParent) => paymentsByParent.flat()),
          map((payments) => {
            const filtered = payments.filter((payment: any) => {
              const paymentStudentId = payment?.studentId ?? payment?.childId ?? payment?.student?.id ?? payment?.child?.id;
              return paymentStudentId ? paymentStudentId === id : true;
            });

            const uniq = new Map<string, StudentPaymentItem>();
            for (const payment of filtered) {
              const paymentId = payment?.id ? String(payment.id) : `${payment?.concept ?? 'pago'}-${payment?.dueDate ?? ''}-${payment?.amount ?? ''}`;
              if (!uniq.has(paymentId)) uniq.set(paymentId, payment as StudentPaymentItem);
            }
            return Array.from(uniq.values());
          })
        );
      })
    );
  }
  registerStudentPayment(id: string, dto: RegisterStudentPaymentDto): Observable<StudentPaymentItem> {
    return this.http.post<{ success: boolean; data: StudentPaymentItem }>(`${this.url}/students/${id}/payments`, dto).pipe(map(r => r.data));
  }
  uploadStudentDocuments(id: string, files: File[]): Observable<unknown> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return this.http.post(`${this.url}/students/${id}/documents`, fd);
  }
  deleteStudentDocument(studentId: string, docId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/students/${studentId}/documents/${docId}`);
  }
  getDocumentDownloadUrl(studentId: string, docId: string): string {
    return `${this.url}/students/${studentId}/documents/${docId}/download`;
  }

  // ─── TEACHERS ─────────────────────────────────────────────────────────────
  getTeachers(f: { grade?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    return this.getList<TeacherItem>('/teachers', buildParams(f)).pipe(
      map(r => ({ ...r, data: r.data.map(t => this.normalizeTeacher(t)) }))
    );
  }
  getTeacher(id: string): Observable<TeacherItem> {
    return this.get<TeacherItem>(`/teachers/${id}`).pipe(map(t => this.normalizeTeacher(t)));
  }
  createTeacher(dto: CreateTeacherDto): Observable<TeacherItem> {
    return this.http.post<{ success: boolean; data: TeacherItem }>(`${this.url}/teachers`, dto).pipe(map(r => r.data));
  }
  updateTeacher(id: string, dto: Partial<CreateTeacherDto>): Observable<TeacherItem> {
    return this.http.put<{ success: boolean; data: TeacherItem }>(`${this.url}/teachers/${id}`, dto).pipe(map(r => r.data));
  }
  deleteTeacher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/teachers/${id}`);
  }
  getTeacherActiveCourses(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/teachers/${id}/courses/active`); }
  getTeacherCourseHistory(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/teachers/${id}/courses/history`); }
  /** `sectionId` opcional si el colegio ya no usa secciones; el backend valida según contrato vigente. */
  assignCourseToTeacher(
    teacherId: string,
    dto: { courseId: string; academicYearId: string; sectionId?: string },
  ): Observable<unknown> {
    return this.http.post(`${this.url}/teachers/${teacherId}/courses`, dto);
  }
  unassignCourseFromTeacher(teacherId: string, courseId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/teachers/${teacherId}/courses/${courseId}`);
  }

  // ─── PARENTS ──────────────────────────────────────────────────────────────
  getParents(f: { grade?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    return this.getList<ParentItem>('/parents', buildParams(f)).pipe(
      map(r => ({ ...r, data: r.data.map(p => this.normalizeParent(p)) }))
    );
  }
  getParent(id: string): Observable<ParentItem> {
    return this.get<ParentItem>(`/parents/${id}`).pipe(map(p => this.normalizeParent(p)));
  }
  createParent(dto: CreateParentDto): Observable<ParentItem> {
    return this.http.post<{ success: boolean; data: ParentItem }>(`${this.url}/parents`, dto).pipe(map(r => r.data));
  }
  updateParent(id: string, dto: Partial<CreateParentDto>): Observable<ParentItem> {
    return this.http.put<{ success: boolean; data: ParentItem }>(`${this.url}/parents/${id}`, dto).pipe(map(r => r.data));
  }
  getParentChildren(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/parents/${id}/children`); }
  getParentPayments(id: string): Observable<unknown[]> { return this.get<unknown[]>(`/parents/${id}/payments`); }

  // ─── COURSES ──────────────────────────────────────────────────────────────
  // TODO(backend): cuando el backend persista `schedule` y `color`, se puede eliminar el fallback en localStorage.
  private courseExtrasKey(id: string): string { return `course-extras:${id}`; }
  private readCourseExtras(id: string): { schedule?: ScheduleSlot[]; color?: string } {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(this.courseExtrasKey(id));
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  private writeCourseExtras(id: string, extras: { schedule?: ScheduleSlot[]; color?: string }): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.readCourseExtras(id);
      const next = {
        schedule: extras.schedule !== undefined ? extras.schedule : current.schedule,
        color: extras.color !== undefined ? extras.color : current.color,
      };
      localStorage.setItem(this.courseExtrasKey(id), JSON.stringify(next));
    } catch {}
  }
  private mergeCourseExtras(course: CourseItem): CourseItem {
    const extras = this.readCourseExtras(course.id);
    return {
      ...course,
      schedule: course.schedule ?? extras.schedule,
      color: course.color ?? extras.color,
    };
  }

  getCourses(f: { grade?: string; level?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    return this.getList<CourseItem>('/courses', buildParams(f)).pipe(
      map(r => ({
        ...r,
        data: r.data
          .map(c => this.mergeCourseExtras(c))
          .filter(c => f.status ? true : (c.status || 'ACTIVE').toUpperCase() !== 'ARCHIVED'),
      }))
    );
  }
  getCourse(id: string): Observable<CourseItem> {
    return this.get<CourseItem>(`/courses/${id}`).pipe(map(c => this.mergeCourseExtras(c)));
  }
  createCourse(dto: CreateCourseDto): Observable<CourseItem> {
    const { schedule, color, ...backendDto } = dto;
    return this.http.post<{ success: boolean; data: CourseItem }>(`${this.url}/courses`, { ...backendDto, schedule, color }).pipe(
      map(r => r.data),
      tap(course => this.writeCourseExtras(course.id, { schedule, color })),
      map(course => this.mergeCourseExtras(course))
    );
  }
  updateCourse(id: string, dto: Partial<CreateCourseDto>): Observable<CourseItem> {
    const { schedule, color, ...backendDto } = dto;
    return this.http.put<{ success: boolean; data: CourseItem }>(`${this.url}/courses/${id}`, { ...backendDto, schedule, color }).pipe(
      map(r => r.data),
      tap(() => this.writeCourseExtras(id, { schedule, color })),
      map(course => this.mergeCourseExtras(course))
    );
  }
  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/courses/${id}`).pipe(
      tap(() => { if (typeof window !== 'undefined') localStorage.removeItem(this.courseExtrasKey(id)); })
    );
  }

  // ─── SECTIONS ─────────────────────────────────────────────────────────────
  getSections(f: { grade?: string; level?: string; academicYearId?: string } = {}) {
    return this.getList<SectionItem>('/sections', buildParams(f));
  }
  createSection(dto: CreateSectionDto): Observable<SectionItem> {
    return this.http.post<{ success: boolean; data: SectionItem }>(`${this.url}/sections`, dto).pipe(map(r => r.data));
  }
  updateSection(id: string, dto: Partial<CreateSectionDto>): Observable<SectionItem> {
    return this.http.put<{ success: boolean; data: SectionItem }>(`${this.url}/sections/${id}`, dto).pipe(map(r => r.data));
  }

  // ─── ACADEMIC YEARS ───────────────────────────────────────────────────────
  getAcademicYears(): Observable<AcademicYearItem[]> {
    return this.http.get<{ success: boolean; data: AcademicYearItem[] }>(`${this.url}/academic-years`)
      .pipe(map(r => r.data));
  }
  createAcademicYear(dto: CreateAcademicYearDto): Observable<AcademicYearItem> {
    return this.http.post<{ success: boolean; data: AcademicYearItem }>(`${this.url}/academic-years`, dto).pipe(map(r => r.data));
  }
  updateAcademicYear(id: string, dto: Partial<CreateAcademicYearDto>): Observable<AcademicYearItem> {
    return this.http.put<{ success: boolean; data: AcademicYearItem }>(`${this.url}/academic-years/${id}`, dto).pipe(map(r => r.data));
  }
  getAcademicYearPeriods(id: string): Observable<AcademicPeriod[]> { return this.get<AcademicPeriod[]>(`/academic-years/${id}/periods`); }

  // ─── ENROLLMENTS ──────────────────────────────────────────────────────────
  getEnrollments(f: { grade?: string; section?: string; year?: string; page?: number; pageSize?: number } = {}) {
    return this.getList<EnrollmentItem>('/enrollments', buildParams(f));
  }
  createEnrollment(dto: CreateEnrollmentDto): Observable<EnrollmentItem> {
    return this.http.post<{ success: boolean; data: EnrollmentItem }>(`${this.url}/enrollments`, dto).pipe(map(r => r.data));
  }
  updateEnrollment(id: string, dto: { status: string }): Observable<EnrollmentItem> {
    return this.http.put<{ success: boolean; data: EnrollmentItem }>(`${this.url}/enrollments/${id}`, dto).pipe(map(r => r.data));
  }

  // ─── TEACHER ASSIGNMENTS ──────────────────────────────────────────────────
  getTeacherAssignments(f: { page?: number; pageSize?: number } = {}) {
    return this.getList<AssignmentItem>('/teacher-assignments', buildParams(f));
  }
  createTeacherAssignment(dto: CreateAssignmentDto): Observable<AssignmentItem> {
    return this.http.post<{ success: boolean; data: AssignmentItem }>(`${this.url}/teacher-assignments`, dto).pipe(map(r => r.data));
  }
  updateTeacherAssignment(id: string, dto: { isActive: boolean }): Observable<AssignmentItem> {
    return this.http.put<{ success: boolean; data: AssignmentItem }>(`${this.url}/teacher-assignments/${id}`, dto).pipe(map(r => r.data));
  }
  deleteTeacherAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/teacher-assignments/${id}`);
  }

  // ─── ROLES ────────────────────────────────────────────────────────────────
  getRoles(): Observable<RoleItem[]> {
    return this.http.get<{ success: boolean; data: RoleItem[] }>(`${this.url}/roles`).pipe(map(r => r.data));
  }
  updateRole(id: string, dto: { description?: string; permissions?: string[] }): Observable<RoleItem> {
    return this.http.put<{ success: boolean; data: RoleItem }>(`${this.url}/roles/${id}`, dto).pipe(map(r => r.data));
  }

  // ─── REPORTS ──────────────────────────────────────────────────────────────
  getReport(type: string, params: Record<string, string> = {}): Observable<unknown> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.url}/reports/${type}`, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }
}
