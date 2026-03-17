import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

function buildParams(f: Record<string, string | number | boolean | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

export interface Child {
  id: string; studentCode: string; code?: string;
  name?: string; grade?: string; section?: string; photo?: string;
  user: { firstName: string; lastName: string; avatarUrl?: string };
  enrollments?: { section: { name: string; grade: string }; academicYear: { name: string } }[];
}

export interface ParentPayment {
  id: string; concept: string; description?: string; amount: number;
  status: string; category?: string; dueDate?: string;
  paymentDate?: string; receiptUrl?: string;
}

export interface ParentJustification {
  id: string; reason: string; date: string; status: string;
  submittedAt?: string; notes?: string;
  attachments?: { id: string; name: string; url?: string }[];
}

@Injectable({ providedIn: 'root' })
export class ParentService {
  private readonly url = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<{ success: boolean; data: T }>(`${this.url}${path}`, { params })
      .pipe(map((r: any) => r.data));
  }

  // ─── CHILDREN ─────────────────────────────────────────────────────────────
  getChildren(): Observable<Child[]> {
    return this.get<Child[]>('/parent/children').pipe(
      map(list => list.map(c => this.normalizeChild(c)))
    );
  }
  getChild(childId: string): Observable<Child> {
    return this.get<Child>(`/parent/children/${childId}`).pipe(
      map(c => this.normalizeChild(c))
    );
  }

  private normalizeChild(c: Child): Child {
    const enrollment = c.enrollments?.[0];
    return {
      ...c,
      name: c.name ?? `${c.user.firstName} ${c.user.lastName}`,
      code: c.code ?? c.studentCode,
      grade: c.grade ?? enrollment?.section?.grade ?? '',
      section: c.section ?? enrollment?.section?.name ?? '',
      photo: c.photo ?? c.user.avatarUrl ?? undefined
    };
  }

  // ─── COURSES ──────────────────────────────────────────────────────────────
  getChildCourses(childId: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/parent/children/${childId}/courses`);
  }
  getChildCourse(childId: string, courseId: string): Observable<unknown> {
    return this.get<unknown>(`/parent/children/${childId}/courses/${courseId}`);
  }
  getChildCourseUnits(childId: string, courseId: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/parent/children/${childId}/courses/${courseId}/units`);
  }
  getChildCourseTasks(childId: string, courseId: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/parent/children/${childId}/courses/${courseId}/tasks`);
  }

  // ─── TASKS ────────────────────────────────────────────────────────────────
  getChildTasks(childId: string, f: { status?: string; search?: string } = {}): Observable<unknown[]> {
    return this.get<unknown[]>(`/parent/children/${childId}/tasks`, buildParams(f));
  }

  // ─── GRADES ───────────────────────────────────────────────────────────────
  getChildGrades(childId: string): Observable<unknown[]> {
    return this.get<unknown[]>(`/parent/children/${childId}/grades`);
  }
  getChildGradesExportUrl(childId: string): string {
    return `${this.url}/parent/children/${childId}/grades/export`;
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  getChildAttendance(childId: string): Observable<unknown> {
    return this.get<unknown>(`/parent/children/${childId}/attendance`);
  }

  // ─── JUSTIFICATIONS ───────────────────────────────────────────────────────
  getJustifications(childId: string): Observable<ParentJustification[]> {
    return this.get<ParentJustification[]>(`/parent/children/${childId}/justifications`);
  }
  submitJustification(childId: string, reason: string, date: string, file?: File): Observable<ParentJustification> {
    const fd = new FormData();
    fd.append('reason', reason);
    fd.append('date', date);
    if (file) fd.append('files', file);
    return this.http.post<{ success: boolean; data: ParentJustification }>(
      `${this.url}/parent/children/${childId}/justifications`, fd
    ).pipe(map(r => r.data));
  }

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  getPayments(childId: string, f: { status?: string; category?: string; search?: string } = {}): Observable<ParentPayment[]> {
    return this.get<ParentPayment[]>(`/parent/children/${childId}/payments`, buildParams(f));
  }
  getReceiptUrl(childId: string, paymentId: string): string {
    return `${this.url}/parent/children/${childId}/payments/${paymentId}/receipt`;
  }
}
