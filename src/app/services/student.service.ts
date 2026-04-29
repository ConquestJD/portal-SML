import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

function buildParams(f: Record<string, string | number | boolean | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

export interface StudentCourse {
  id: string; // TeacherAssignment ID
  course: { id: string; name: string; code?: string; color?: string; imageUrl?: string };
  teacher: { user: { firstName: string; lastName: string; avatarUrl?: string } };
  section: { name: string; grade: string };
  academicYear: { name: string };
  averageScore?: number;
  pendingTasksCount?: number;
  // Flat aliases for template compatibility
  name?: string;
  code?: string;
  period?: string;
  teacherPhoto?: string;
  average?: number;
  teacherName?: string;
  gradeSection?: string;
}

export interface StudentTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxScore: number;
  /** Límite de envíos/actualizaciones en el portal (por defecto 1). */
  maxSubmissions?: number;
  status: string;
  /** Normalizado: archivo | texto | ambos | clase */
  deliveryType?: string;
  course?: { name: string };
  teacherName?: string;
  unit?: { id?: string; title?: string; number?: number } | null;
  submission?: {
    id: string;
    status: string;
    score?: number;
    feedback?: string;
    submittedAt?: string;
    gradedAt?: string;
    content?: string | null;
    /** Cuántas veces se ha pulsado “Entregar” con éxito para esta tarea. */
    submitCount?: number;
    attachments?: { id: string; name: string }[];
  };
  attachments?: { id: string; name: string }[];
}

export interface StudentGrade {
  id: string;
  score: number;
  notes?: string;
  course?: { name: string };
  period?: { id: string; name: string };
  createdAt?: string;
  teacherAssignmentId?: string;
}

export interface StudentAttendance {
  id: string; date: string; status: string; notes?: string;
  course?: { name: string };
}

export interface StudentProfile {
  id: string; studentCode: string; birthDate?: string; gender?: string;
  address?: string; bloodType?: string; medicalNotes?: string;
  user: { id: string; email: string; firstName: string; lastName: string; phone?: string; avatarUrl?: string };
  enrollments?: unknown[];
}

export interface StudentSettings {
  notifications: boolean; language: string; theme: string;
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly url = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<{ success: boolean; data: T }>(`${this.url}${path}`, { params })
      .pipe(map((r: any) => r.data));
  }

  private normalizeStudentGrade(raw: StudentGrade | Record<string, unknown>): StudentGrade {
    const g = raw as Record<string, unknown>;
    const ta = g['teacherAssignment'] as { id?: string; course?: { name?: string } } | undefined;
    const courseFromTa =
      ta?.course?.name != null ? { name: String(ta.course.name) } : undefined;
    const existing = g['course'] as StudentGrade['course'] | undefined;
    return {
      ...(g as unknown as StudentGrade),
      course: existing ?? courseFromTa,
      teacherAssignmentId:
        typeof g['teacherAssignmentId'] === 'string'
          ? (g['teacherAssignmentId'] as string)
          : ta?.id,
    };
  }

  private normalizeStudentTask(raw: StudentTask | Record<string, unknown>): StudentTask {
    const t = raw as Record<string, unknown>;
    const mySub = t['mySubmission'] as StudentTask['submission'] | Record<string, unknown> | undefined;
    const subRaw = (t['submission'] as typeof mySub) ?? mySub;

    const mapTaskFiles = (list: unknown): { id: string; name: string }[] | undefined => {
      if (!Array.isArray(list)) return undefined;
      return list.map((f: Record<string, unknown>) => ({
        id: String(f['id'] ?? ''),
        name: String(f['filename'] ?? f['name'] ?? 'Archivo'),
      }));
    };

    const num = (v: unknown): number | undefined => {
      if (v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    let submission: StudentTask['submission'] | undefined;
    if (subRaw && typeof subRaw === 'object') {
      const s = subRaw as Record<string, unknown>;
      submission = {
        ...(subRaw as StudentTask['submission']),
        content: (s['content'] as string | null | undefined) ?? undefined,
        submitCount: num(s['submitCount']),
        attachments: mapTaskFiles(s['attachments']),
      };
    }

    const rawDt = String(t['deliveryType'] ?? 'ARCHIVO').toUpperCase();
    let deliveryType: StudentTask['deliveryType'] = 'archivo';
    if (rawDt === 'TEXTO') deliveryType = 'texto';
    else if (rawDt === 'AMBOS') deliveryType = 'ambos';
    else if (rawDt === 'EN_CLASE') deliveryType = 'clase';

    const ta = t['teacherAssignment'] as
      | {
          course?: { name?: string };
          teacher?: { user?: { firstName?: string; lastName?: string } };
        }
      | undefined;
    const courseFromList = t['course'] as StudentTask['course'] | undefined;
    const course =
      courseFromList ??
      (ta?.course?.name != null ? { name: String(ta.course.name) } : undefined);
    const u = ta?.teacher?.user;
    const teacherName = u
      ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || undefined
      : undefined;

    const maxSubmissions = num(t['maxSubmissions']) ?? 1;

    const unit = t['unit'] as StudentTask['unit'];

    return {
      ...(t as unknown as StudentTask),
      maxSubmissions: Math.max(1, Math.min(20, maxSubmissions)),
      deliveryType,
      submission,
      course,
      teacherName,
      unit: unit ?? undefined,
      attachments: mapTaskFiles(t['attachments']),
    };
  }

  private normalizeCourse(raw: StudentCourse | Record<string, unknown>): StudentCourse {
    const c = raw as Record<string, unknown>;
    const course = (c['course'] as StudentCourse['course']) ?? { id: String(c['id'] ?? ''), name: '—' };
    const teacherBlock = c['teacher'] as StudentCourse['teacher'] | undefined;
    const teacherUser = teacherBlock?.user ?? { firstName: '', lastName: '' };
    const section = (c['section'] as (StudentCourse['section'] & { academicYear?: { name: string } }) | undefined) ?? {
      name: '',
      grade: '',
    };
    const academicYear =
      (c['academicYear'] as StudentCourse['academicYear'] | undefined) ??
      (section as { academicYear?: { name: string } }).academicYear ??
      { name: '' };

    const base: StudentCourse = {
      ...(c as unknown as StudentCourse),
      id: String(c['id'] ?? ''),
      course,
      teacher: { user: teacherUser },
      section,
      academicYear,
    };

    return {
      ...base,
      name: course.name,
      code: course.code,
      period: academicYear.name,
      average: base.averageScore,
      teacherName: `${teacherUser.firstName ?? ''} ${teacherUser.lastName ?? ''}`.trim() || '—',
      teacherPhoto: teacherUser.avatarUrl,
      gradeSection: section?.grade ?? '',
    };
  }

  // ─── COURSES ──────────────────────────────────────────────────────────────
  getCourses(f: { search?: string; period?: string } = {}): Observable<StudentCourse[]> {
    return this.get<StudentCourse[]>('/student/courses', buildParams(f)).pipe(
      map((list) => (Array.isArray(list) ? list : []).map((c) => this.normalizeCourse(c as StudentCourse))),
    );
  }
  getCourse(courseId: string): Observable<StudentCourse> {
    return this.get<StudentCourse>(`/student/courses/${courseId}`)
      .pipe(map(c => this.normalizeCourse(c)));
  }
  getCourseUnits(courseId: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/student/courses/${courseId}/units`);
  }
  getCourseTasks(courseId: string): Observable<StudentTask[]> {
    return this.get<StudentTask[]>(`/student/courses/${courseId}/tasks`).pipe(
      map((list) => (Array.isArray(list) ? list : []).map((t) => this.normalizeStudentTask(t as StudentTask))),
    );
  }
  getCourseGrades(courseId: string): Observable<StudentGrade[]> {
    return this.get<StudentGrade[]>(`/student/courses/${courseId}/grades`).pipe(
      map((list) =>
        (Array.isArray(list) ? list : []).map((g) => this.normalizeStudentGrade(g as StudentGrade)),
      ),
    );
  }
  getMaterialDownloadUrl(courseId: string, unitId: string): string {
    return `${this.url}/student/courses/${courseId}/materials/${unitId}/download`;
  }

  // ─── TASKS ────────────────────────────────────────────────────────────────
  getTasks(f: { status?: string; search?: string; courseId?: string } = {}): Observable<StudentTask[]> {
    return this.get<StudentTask[]>('/student/tasks', buildParams(f)).pipe(
      map((list) => (Array.isArray(list) ? list : []).map((t) => this.normalizeStudentTask(t as StudentTask))),
    );
  }
  getTask(taskId: string): Observable<StudentTask> {
    return this.get<StudentTask>(`/student/tasks/${taskId}`).pipe(
      map((t) => this.normalizeStudentTask(t as StudentTask)),
    );
  }
  submitTask(taskId: string, formData: FormData): Observable<unknown> {
    return this.http.post<{ success: boolean; data: unknown }>(
      `${this.url}/student/tasks/${taskId}/submit`, formData
    ).pipe(map(r => r.data));
  }
  getTaskMaterialDownloadUrl(taskId: string, fileId: string): string {
    return `${this.url}/student/tasks/${taskId}/materials/${fileId}/download`;
  }
  getSubmissionAttachmentDownloadUrl(taskId: string, fileId: string): string {
    return `${this.url}/student/tasks/${taskId}/submission-attachments/${fileId}/download`;
  }

  /**
   * Descarga vía HttpClient para que el interceptor agregue Bearer (no usar window.open en URLs de API).
   * El backend puede responder 307 hacia R2; el cliente sigue el redirect y devuelve el archivo.
   */
  downloadAuthenticatedBlob(url: string): Observable<{ blob: Blob; filename?: string }> {
    return this.http
      .get(url, { responseType: 'blob', observe: 'response' })
      .pipe(
        map((res: HttpResponse<Blob>) => {
          const body = res.body;
          if (!body) {
            throw new Error('Respuesta vacía');
          }
          let filename: string | undefined;
          const cd = res.headers.get('Content-Disposition');
          if (cd) {
            const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd);
            const quoted = /filename="([^"]+)"/i.exec(cd);
            const plain = /filename=([^;\n]+)/i.exec(cd);
            if (star) {
              try {
                filename = decodeURIComponent(star[1].trim());
              } catch {
                filename = star[1].trim();
              }
            } else if (quoted) {
              filename = quoted[1].trim();
            } else if (plain) {
              filename = plain[1].trim().replace(/['"]/g, '');
            }
          }
          return { blob: body, filename };
        }),
      );
  }

  downloadCourseMaterialBlob(courseId: string, unitOrMaterialId: string): Observable<{ blob: Blob; filename?: string }> {
    return this.downloadAuthenticatedBlob(this.getMaterialDownloadUrl(courseId, unitOrMaterialId));
  }

  downloadTaskMaterialBlob(taskId: string, fileId: string): Observable<{ blob: Blob; filename?: string }> {
    return this.downloadAuthenticatedBlob(this.getTaskMaterialDownloadUrl(taskId, fileId));
  }

  downloadSubmissionAttachmentBlob(taskId: string, fileId: string): Observable<{ blob: Blob; filename?: string }> {
    return this.downloadAuthenticatedBlob(this.getSubmissionAttachmentDownloadUrl(taskId, fileId));
  }

  // ─── GRADES ───────────────────────────────────────────────────────────────
  getGrades(f: { period?: string; courseId?: string } = {}): Observable<StudentGrade[]> {
    return this.get<StudentGrade[]>('/student/grades', buildParams(f)).pipe(
      map((list) =>
        (Array.isArray(list) ? list : []).map((g) => this.normalizeStudentGrade(g as StudentGrade)),
      ),
    );
  }
  getGradesExportUrl(period?: string): string {
    return period
      ? `${this.url}/student/grades/export?period=${period}`
      : `${this.url}/student/grades/export`;
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  private normalizeStudentAttendance(raw: StudentAttendance | Record<string, unknown>): StudentAttendance {
    const r = raw as Record<string, unknown>;
    const ta = r['teacherAssignment'] as { course?: { name?: string } } | undefined;
    const status = String(r['status'] ?? '').toUpperCase();
    let dateStr = '';
    const dv = r['date'];
    if (dv != null) {
      const d = new Date(dv as string | number | Date);
      dateStr = Number.isNaN(d.getTime()) ? String(dv).slice(0, 10) : d.toISOString().slice(0, 10);
    }
    return {
      id: String(r['id'] ?? ''),
      date: dateStr,
      status,
      notes: r['notes'] != null ? String(r['notes']) : undefined,
      course: ta?.course?.name != null ? { name: String(ta.course.name) } : undefined,
    };
  }

  private summarizeAttendanceRecords(records: StudentAttendance[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const rec of records) {
      const k = (rec.status || 'UNKNOWN').toUpperCase();
      summary[k] = (summary[k] ?? 0) + 1;
    }
    return summary;
  }

  getAttendance(f: { month?: string; courseId?: string } = {}): Observable<{ records: StudentAttendance[]; summary: Record<string, number> }> {
    return this.http
      .get<{ success: boolean; data: unknown }>(`${this.url}/student/attendance`, { params: buildParams(f) })
      .pipe(
        map((r) => {
          const d = r.data as { records?: unknown[]; summary?: Record<string, number> } | unknown[] | null | undefined;
          if (Array.isArray(d)) {
            const records = d.map((row) => this.normalizeStudentAttendance(row as Record<string, unknown>));
            return { records, summary: this.summarizeAttendanceRecords(records) };
          }
          const rows = (d as { records?: unknown[] })?.records ?? [];
          const records = rows.map((row) => this.normalizeStudentAttendance(row as Record<string, unknown>));
          const summary =
            (d as { summary?: Record<string, number> })?.summary ?? this.summarizeAttendanceRecords(records);
          return { records, summary };
        }),
      );
  }

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  getProfile(): Observable<StudentProfile> {
    return this.get<StudentProfile>('/student/profile');
  }
  uploadPhoto(file: File): Observable<StudentProfile> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.http.post<{ success: boolean; data: StudentProfile }>(
      `${this.url}/student/profile/photo`, fd
    ).pipe(map(r => r.data));
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  getSettings(): Observable<StudentSettings> {
    return this.get<StudentSettings>('/student/settings');
  }
  updateSettings(dto: Partial<StudentSettings>): Observable<StudentSettings> {
    return this.http.put<{ success: boolean; data: StudentSettings }>(
      `${this.url}/student/settings`, dto
    ).pipe(map(r => r.data));
  }
}
