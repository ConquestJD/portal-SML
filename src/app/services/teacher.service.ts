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

export interface TeacherCourse {
  id: string; // TeacherAssignment ID
  course: { id: string; name: string; code?: string; description?: string };
  section: { id: string; name: string; grade: string; level: string };
  academicYear: { id: string; name: string };
  studentsCount?: number;
  // Flat aliases for template compatibility
  name?: string;
  code?: string;
  grade?: string;
  schedule?: string;
  students?: number;
  period?: string;
  gradeSection?: string;
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

  private normalizeCourse(c: TeacherCourse): TeacherCourse {
    return {
      ...c,
      name: c.course.name,
      code: c.course.code,
      grade: c.section.grade,
      students: c.studentsCount,
      period: c.academicYear.name,
      gradeSection: `${c.section.grade} - Sección ${c.section.name}`
    };
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
  getStudentsInCourse(courseId: string, search?: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/teacher/courses/${courseId}/students`, search ? buildParams({ search }) : undefined);
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
