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
  teacher?: { name: string; specialty?: string };
  summary: { totalCourses: number; totalStudents: number; pendingGrading: number; attendancePending: number };
  recentActivity?: unknown[];
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
  recentAnnouncements?: unknown[];
}

export interface ParentDashboard {
  summary: { pendingTasks: number; recentComunicados: number };
  attendance?: { today: boolean; weekPercentage: number };
  upcomingEvaluations?: number;
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
