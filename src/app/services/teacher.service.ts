import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

function buildParams(f: Record<string, string | number | boolean | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

/**
 * Si el backend devuelve filas con `student.grade` / `student.level`, reduce la nómina al grado del curso.
 * Las filas sin `grade` se conservan (compatibilidad con respuestas antiguas).
 */
export function filterTeacherRosterByCourseGrade(
  rows: unknown[] | null | undefined,
  courseGrade: string,
  courseLevel?: string
): unknown[] {
  const list = rows ?? [];
  const g = (courseGrade ?? '').trim();
  if (!g) return list;
  const wantLv = (courseLevel ?? '').trim().toLowerCase();
  return list.filter((r: any) => {
    const s = r?.student ?? r;
    const sg = (s?.grade ?? r?.grade ?? '').toString().trim();
    if (!sg) return true;
    if (sg !== g) return false;
    if (!wantLv) return true;
    const sl = (s?.level ?? r?.level ?? '').toString().trim().toLowerCase();
    if (!sl) return true;
    return sl === wantLv;
  });
}

/**
 * Respuesta típica de `GET /teacher/courses`: **asignación docente** (teacher-course assignment).
 * coincide con filas donde `course`, `section` y opcionalmente `academicYear` vienen anidados;
 * `academicYear` puede faltar y solo venir `academicYearId` en la raíz.
 *
 * Para llamadas `/teacher/courses/:courseId/...` el parámetro es el **id de la asignación docente**
 * (`TeacherAssignment`, mismo valor que `TeacherCourse.id` en filas de asignación). El id del curso
 * en catálogo queda en `resourceCourseId` solo para referencia (p. ej. enlaces admin).
 */
export interface TeacherCourse {
  /** Id de la asignación (`teacher-assignments`). */
  id: string;
  teacherId?: string;
  courseId?: string;
  sectionId?: string;
  academicYearId?: string;
  isActive?: boolean;
  course: {
    id: string;
    name: string;
    code?: string;
    description?: string | null;
    grade?: string;
    level?: string;
    hours?: number;
    status?: string;
    schedule?: { day?: string; startTime?: string; endTime?: string }[] | null;
    color?: string | null;
  };
  /** Puede omitirse en respuestas parciales. */
  section: { id: string; name: string; grade?: string; level?: string };
  /** Si el backend no lo anida, generamos `{ id: academicYearId, name: '—' }`. */
  academicYear: { id: string; name: string };
  studentsCount?: number;

  /** Id del curso en catálogo; referencia para enlaces admin. */
  resourceCourseId: string;

  // Aliases planos para plantillas
  name?: string;
  code?: string;
  grade?: string;
  students?: number;
  period?: string;
  gradeSection?: string;
  /** Copia de `course.status` en mayúsculas (p. ej. ACTIVE, ARCHIVED). */
  courseStatus?: string;
  /** Compatibilidad con plantillas que comparan 'active' / 'finished'. */
  status?: 'active' | 'archived' | 'finished';
  pendingGrading?: number;
  averageGrade?: number;
}

export interface TeacherTask {
  id: string; title: string; description?: string;
  dueDate?: string; maxScore: number; status: string;
  submissionsCount?: number; gradedCount?: number;
  attachments?: { id: string; name: string; url?: string }[];
}

export interface TaskSubmission {
  id: string; status: string; score?: number | null; feedback?: string | null;
  content?: string; submittedAt?: string;
  student: { id: string; studentCode: string; user: { firstName: string; lastName: string; avatarUrl?: string } };
  attachments?: { id: string; name: string; url?: string }[];
}

export interface AttendanceRecord {
  studentId: string; date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';
  notes?: string;
}

export interface AttendanceEntry {
  id?: string; date: string; status: string; notes?: string;
  student?: { id: string; studentCode: string; user: { firstName: string; lastName: string } };
}

export interface GradeEntry {
  id: string; score: number; notes?: string;
  student: { id: string; studentCode: string; user: { firstName: string; lastName: string } };
  period?: { id: string; name: string };
}

export interface Material {
  id: string; title: string; description?: string;
  files: { id: string; name: string; url?: string; size?: number; mimeType?: string }[];
  unit?: { id: string; title: string };
  createdAt?: string;
}

export interface TeacherProfile {
  id: string; teacherCode?: string; specialty?: string; bio?: string;
  user: { id: string; email: string; firstName: string; lastName: string; phone?: string; avatarUrl?: string };
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly url = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<{ success: boolean; data: T }>(`${this.url}${path}`, { params })
      .pipe(map((r: any) => r.data));
  }

  /**
   * Adapta tanto filas de **asignación** (con `course` + `section` + `academicYearId`)
   * como un **curso plano** del catálogo. Como en este colegio **las secciones no existen**
   * (todos los alumnos de un grado están en el mismo curso), se ignora intencionalmente
   * `section.grade`/`section.name` y se usa siempre el `course.grade` / `course.level`.
   */
  private normalizeCourse(raw: any): TeacherCourse {
    const flat = raw && raw.name && raw.id && !raw.course;
    if (flat) {
      const grade = (raw.grade ?? '').trim();
      const level = ((raw.level ?? '') as string).trim();
      const label = [grade, level].filter(Boolean).join(' · ') || '—';
      return {
        id: raw.id,
        resourceCourseId: raw.id,
        course: {
          id: raw.id,
          name: raw.name,
          code: raw.code,
          description: raw.description,
          grade,
          level,
          hours: raw.hours,
          status: raw.status,
          schedule: raw.schedule,
          color: raw.color,
        },
        section: { id: '', name: '', grade, level },
        academicYear: { id: '', name: '' },
        studentsCount: raw.studentsCount,
        name: raw.name,
        code: raw.code,
        grade,
        students: raw.studentsCount,
        period: '',
        gradeSection: label,
        courseStatus: raw.status,
        status: this.mapCourseStatusForUi(raw.status),
        pendingGrading: raw.pendingGrading ?? 0,
        averageGrade: raw.averageGrade,
      };
    }

    const course = raw.course ?? {};
    const ay = raw.academicYear;
    // La sección viene del backend pero NO la usamos para mostrar grado/nivel,
    // porque el sistema migró a "un grado = un curso" (sin secciones).
    const grade = (course.grade ?? '').trim();
    const level = ((course.level ?? '') as string).trim();
    const periodName = ay?.name?.trim() ? ay.name : '';
    const gradeSection = [grade, level].filter(Boolean).join(' · ') || '—';
    const resourceCourseId = course.id ?? raw.courseId ?? raw.id;

    return {
      ...raw,
      id: raw.id,
      teacherId: raw.teacherId,
      courseId: raw.courseId,
      sectionId: raw.sectionId,
      academicYearId: raw.academicYearId,
      isActive: raw.isActive,
      course: {
        id: resourceCourseId,
        name: course.name ?? '—',
        code: course.code,
        description: course.description,
        grade,
        level,
        hours: course.hours,
        status: course.status,
        schedule: course.schedule,
        color: course.color,
      },
      // Mantenemos la información cruda de sección por compatibilidad con otros endpoints
      // que aún la requieran, pero la UI debe usar `course.grade` / `course.level`.
      section: raw.section
        ? {
            id: raw.section.id,
            name: raw.section.name,
            grade: raw.section.grade,
            level: raw.section.level,
          }
        : { id: raw.sectionId ?? '', name: '', grade, level },
      academicYear: ay ?? { id: raw.academicYearId ?? '', name: periodName || '' },
      studentsCount: raw.studentsCount,
      resourceCourseId,
      name: course.name,
      code: course.code,
      grade,
      students: raw.studentsCount,
      period: periodName,
      gradeSection,
      courseStatus: course.status,
      status: this.mapCourseStatusForUi(course.status),
      pendingGrading: raw.pendingGrading ?? 0,
      averageGrade: raw.averageGrade,
    };
  }

  private mapCourseStatusForUi(s?: string): 'active' | 'archived' | 'finished' {
    const u = (s ?? '').toUpperCase();
    if (u === 'ACTIVE') return 'active';
    if (u === 'ARCHIVED') return 'archived';
    if (u === 'FINISHED' || u === 'COMPLETED') return 'finished';
    return 'active';
  }

  // ─── COURSES ──────────────────────────────────────────────────────────────
  getCourses(f: { search?: string; period?: string } = {}): Observable<TeacherCourse[]> {
    return this.get<TeacherCourse[]>('/teacher/courses', buildParams(f))
      .pipe(map(list => list.map(c => this.normalizeCourse(c))));
  }
  getCourse(courseId: string): Observable<TeacherCourse> {
    return this.get<TeacherCourse>(`/teacher/courses/${courseId}`)
      .pipe(map(c => this.normalizeCourse(c)));
  }
  /**
   * Listado de alumnos del curso para el docente. No usar `GET /students` (requiere rol ADMIN).
   * Opcional `grade` / `level`: si el backend los soporta, filtra en servidor; si no, se ignoran.
   * Tras recibir datos, conviene aplicar `filterTeacherRosterByCourseGrade` en cliente si cada fila trae `grade`.
   */
  getStudentsInCourse(
    courseId: string,
    f: { search?: string; grade?: string; level?: string } = {}
  ): Observable<unknown[]> {
    const params = buildParams({
      search: f.search,
      grade: f.grade,
      level: f.level,
    });
    const hasParams = [...params.keys()].length > 0;
    return this.get<unknown[]>(
      `/teacher/courses/${courseId}/students`,
      hasParams ? params : undefined
    );
  }

  /**
   * Cantidad de alumnos para una asignación docente (misma lógica que el detalle del curso).
   */
  getRosterCountForCourse(c: TeacherCourse): Observable<number> {
    const grade = (c.course?.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    return this.getStudentsInCourse(c.id, {
      ...(grade ? { grade } : {}),
      ...(level ? { level } : {}),
    }).pipe(
      map(rows => filterTeacherRosterByCourseGrade(rows, grade, level).length),
      catchError(() => of(0))
    );
  }

  /** `assignmentId` → número de alumnos (cards y tablas «Mis cursos»). */
  getRosterCountsForCourses(courses: TeacherCourse[]): Observable<Record<string, number>> {
    if (!courses.length) return of({});
    return forkJoin(
      courses.map(c =>
        this.getRosterCountForCourse(c).pipe(map(n => [c.id, n] as [string, number]))
      )
    ).pipe(map(pairs => Object.fromEntries(pairs) as Record<string, number>));
  }

  getStudentFicha(courseId: string, studentId: string): Observable<unknown> {
    return this.get<unknown>(`/teacher/courses/${courseId}/students/${studentId}`);
  }

  // ─── TASKS ────────────────────────────────────────────────────────────────
  getTasks(courseId: string, f: { status?: string; search?: string } = {}): Observable<TeacherTask[]> {
    return this.get<TeacherTask[]>(`/teacher/courses/${courseId}/tasks`, buildParams(f));
  }
  getTask(courseId: string, taskId: string): Observable<TeacherTask> {
    return this.get<TeacherTask>(`/teacher/courses/${courseId}/tasks/${taskId}`);
  }
  createTask(courseId: string, formData: FormData): Observable<TeacherTask> {
    return this.http.post<{ success: boolean; data: TeacherTask }>(
      `${this.url}/teacher/courses/${courseId}/tasks`, formData
    ).pipe(map(r => r.data));
  }
  updateTask(courseId: string, taskId: string, dto: Partial<{ title: string; description: string; dueDate: string; maxScore: number; status: string }>): Observable<TeacherTask> {
    return this.http.put<{ success: boolean; data: TeacherTask }>(
      `${this.url}/teacher/courses/${courseId}/tasks/${taskId}`, dto
    ).pipe(map(r => r.data));
  }
  deleteTask(courseId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/teacher/courses/${courseId}/tasks/${taskId}`);
  }

  // ─── SUBMISSIONS ──────────────────────────────────────────────────────────
  getSubmissions(courseId: string, taskId: string, f: { status?: string; search?: string } = {}): Observable<TaskSubmission[]> {
    return this.get<TaskSubmission[]>(`/teacher/courses/${courseId}/tasks/${taskId}/submissions`, buildParams(f));
  }
  gradeSubmission(courseId: string, taskId: string, submissionId: string, score: number, feedback: string): Observable<TaskSubmission> {
    return this.http.put<{ success: boolean; data: TaskSubmission }>(
      `${this.url}/teacher/courses/${courseId}/tasks/${taskId}/submissions/${submissionId}/grade`,
      { score, feedback }
    ).pipe(map(r => r.data));
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  getAttendanceByDate(courseId: string, date: string): Observable<AttendanceEntry[]> {
    return this.get<AttendanceEntry[]>(`/teacher/courses/${courseId}/attendance`, buildParams({ date }));
  }
  saveAttendance(courseId: string, records: AttendanceRecord[]): Observable<unknown> {
    return this.http.post<{ success: boolean; data: unknown }>(
      `${this.url}/teacher/courses/${courseId}/attendance`, { records }
    ).pipe(map(r => r.data));
  }
  getAttendanceHistory(courseId: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/teacher/courses/${courseId}/attendance/history`);
  }

  // ─── GRADES ───────────────────────────────────────────────────────────────
  getGrades(courseId: string): Observable<GradeEntry[]> {
    return this.get<GradeEntry[]>(`/teacher/courses/${courseId}/grades`);
  }
  createGrade(courseId: string, dto: { studentId: string; periodId: string; score: number; notes?: string }): Observable<GradeEntry> {
    return this.http.post<{ success: boolean; data: GradeEntry }>(
      `${this.url}/teacher/courses/${courseId}/grades`, dto
    ).pipe(map(r => r.data));
  }
  updateGrade(courseId: string, gradeId: string, dto: { score?: number; notes?: string }): Observable<GradeEntry> {
    return this.http.put<{ success: boolean; data: GradeEntry }>(
      `${this.url}/teacher/courses/${courseId}/grades/${gradeId}`, dto
    ).pipe(map(r => r.data));
  }

  // ─── MATERIALS ────────────────────────────────────────────────────────────
  getMaterials(courseId: string): Observable<Material[]> {
    return this.get<Material[]>(`/teacher/courses/${courseId}/materials`);
  }
  createMaterial(courseId: string, formData: FormData): Observable<Material> {
    return this.http.post<{ success: boolean; data: Material }>(
      `${this.url}/teacher/courses/${courseId}/materials`, formData
    ).pipe(map(r => r.data));
  }
  updateMaterial(courseId: string, materialId: string, dto: { title?: string; description?: string }): Observable<Material> {
    return this.http.put<{ success: boolean; data: Material }>(
      `${this.url}/teacher/courses/${courseId}/materials/${materialId}`, dto
    ).pipe(map(r => r.data));
  }
  deleteMaterial(courseId: string, materialId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/teacher/courses/${courseId}/materials/${materialId}`);
  }

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  getProfile(): Observable<TeacherProfile> {
    return this.get<TeacherProfile>('/teacher/profile');
  }
  updateProfile(dto: { bio?: string; specialty?: string; phone?: string }): Observable<TeacherProfile> {
    return this.http.put<{ success: boolean; data: TeacherProfile }>(
      `${this.url}/teacher/profile`, dto
    ).pipe(map(r => r.data));
  }
  uploadPhoto(file: File): Observable<TeacherProfile> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.http.post<{ success: boolean; data: TeacherProfile }>(
      `${this.url}/teacher/profile/photo`, fd
    ).pipe(map(r => r.data));
  }
}
