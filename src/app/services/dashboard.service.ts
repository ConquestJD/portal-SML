import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface StudentDashboard {
  student: {
    name: string;
    studentCode: string;
    section?: string | null;
    grade?: string | null;
    level?: string | null;
    gradeLabel?: string | null;
    academicYear?: string | null;
  };
  summary: { pendingTasks: number; totalCourses: number; attendanceSummary: Record<string, number> };
  recentGrades: unknown[];
  recentAnnouncements: unknown[];
}

export interface TeacherDashboard {
  teacher?: { name: string };
  summary: {
    totalCourses: number;
    totalStudents: number;
    pendingGrading: number;
    unreadComunicados: number;
    attendancePending: number;
  };
  recentActivity?: unknown[];
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content?: string;
  type?: string;
  priority?: string;
  publishedAt?: string | Date | null;
  createdAt?: string | Date;
}

export interface AdminDashboard {
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    activeEnrollments: number;
    pendingJustifications: number;
    pendingPayments: number;
  };
  recentAnnouncements?: AdminAnnouncement[];
}

export interface ParentDashboardChild {
  id: string;
  name: string;
  studentCode: string;
  section: string | null;
  grade: string | null;
  academicYear: string | null;
}

export interface ParentDashboardComunicado {
  id: string;
  title: string;
  publishedAt: string | Date | null;
  isRead: boolean;
}

export interface ParentDashboardAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
}

export interface ParentDashboard {
  pendingPayments: number;
  child: ParentDashboardChild | null;
  summary: {
    pendingTasks: number;
    unreadComunicados: number;
  };
  attendance: {
    today: { status: string | null; label: string; sessionCount: number };
    week: { present: number; total: number; percentage: number };
  };
  recentComunicados: ParentDashboardComunicado[];
  alerts: ParentDashboardAlert[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStudentDashboard(): Observable<StudentDashboard> {
    return this.http.get<{ success: boolean; data: StudentDashboard }>(`${this.url}/dashboard/student`)
      .pipe(map(r => r.data));
  }

  getTeacherDashboard(): Observable<TeacherDashboard> {
    return this.http.get<{ success: boolean; data: TeacherDashboard }>(`${this.url}/dashboard/teacher`)
      .pipe(map(r => r.data));
  }

  getAdminDashboard(): Observable<AdminDashboard> {
    return this.http.get<{ success: boolean; data: AdminDashboard }>(`${this.url}/dashboard/admin`)
      .pipe(map(r => r.data));
  }

  getParentDashboard(childId?: string): Observable<ParentDashboard> {
    let params = new HttpParams();
    if (childId) params = params.set('childId', childId);
    return this.http.get<{ success: boolean; data: ParentDashboard }>(`${this.url}/dashboard/parent`, { params })
      .pipe(map(r => r.data));
  }
}
