import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  id: string; title: string; description?: string;
  dueDate?: string; maxScore: number; status: string;
  course?: { name: string };
  submission?: {
    id: string;
    status: string;
    score?: number;
    feedback?: string;
    submittedAt?: string;
    gradedAt?: string;
  };
  attachments?: { id: string; name: string; url?: string }[];
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
    const mySub = t['mySubmission'] as StudentTask['submission'] | undefined;
    const sub = (t['submission'] as StudentTask['submission'] | undefined) ?? mySub;
    const ta = t['teacherAssignment'] as { course?: { name?: string } } | undefined;
    const courseFromList = t['course'] as StudentTask['course'] | undefined;
    const course =
      courseFromList ??
      (ta?.course?.name != null ? { name: String(ta.course.name) } : undefined);
    return {
      ...(t as unknown as StudentTask),
      submission: sub,
      course,
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
  getAttendance(f: { month?: string; courseId?: string } = {}): Observable<{ records: StudentAttendance[]; summary: Record<string, number> }> {
    return this.http.get<{ success: boolean; data: { records: StudentAttendance[]; summary: Record<string, number> } }>(
      `${this.url}/student/attendance`, { params: buildParams(f) }
    ).pipe(map(r => r.data));
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
