import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService, Child } from '../../../services/parent.service';

export interface ChildProfileVm {
  name: string;
  gradeLine: string;
  code: string;
  status: string;
  academicYear: string;
  enrollmentDate: string | Date | null;
  photo?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  bloodType?: string;
  medicalNotes?: string;
  academicSummary: {
    overallAverage: number | null;
    completedTasks: number;
    totalTasks: number;
    pendingTasks: number;
    attendancePercentage: number;
    totalCourses: number;
    totalAbsences: number;
    totalLates: number;
  };
  courses: { id: string; name: string; teacher: string }[];
}

@Component({
  selector: 'app-perfil-hijo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './perfil-hijo.component.html',
  styleUrl: './perfil-hijo.component.css',
})
export class PerfilHijoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  childDetail = signal<Child | null>(null);
  childProfile = signal<ChildProfileVm | null>(null);
  activeTab = signal<'resumen' | 'academico'>('resumen');

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) {
          this.selectedChildId.set(data[0].id);
          this.loadChild(data[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: 'resumen' | 'academico') {
    this.activeTab.set(tab);
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
    this.loadChild(childId);
  }

  loadChild(childId: string) {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      detail: this.parentService.getChild(childId),
      tasks: this.parentService.getChildTasks(childId, {}).pipe(catchError(() => of([]))),
      grades: this.parentService.getChildGrades(childId).pipe(catchError(() => of([]))),
      attendance: this.parentService.getChildAttendance(childId).pipe(catchError(() => of([]))),
      courses: this.parentService.getChildCourses(childId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ detail, tasks, grades, attendance, courses }) => {
        this.childDetail.set(detail);
        const taskArr = Array.isArray(tasks) ? tasks : [];
        const gradeArr = Array.isArray(grades) ? grades : [];
        const attArr = Array.isArray(attendance) ? attendance : [];
        const courseArr = Array.isArray(courses) ? courses : [];
        this.childProfile.set(this.buildProfile(detail, taskArr, gradeArr, attArr, courseArr));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el perfil');
        this.childProfile.set(null);
        this.loading.set(false);
      },
    });
  }

  private buildProfile(
    detail: Child,
    tasks: unknown[],
    grades: unknown[],
    attendance: unknown[],
    courses: unknown[],
  ): ChildProfileVm {
    const en = detail.enrollments?.[0];
    const taskList = tasks as { childSubmission?: unknown | null }[];
    const totalTasks = taskList.length;
    const completedTasks = taskList.filter((t) => t.childSubmission != null).length;
    const pendingTasks = Math.max(0, totalTasks - completedTasks);

    const gradeList = grades as { score?: number }[];
    const scores = gradeList.map((g) => g.score).filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
    const overallAverage =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

    const att = attendance as { status?: string }[];
    const totalAbsences = att.filter((a) => String(a.status ?? '').toUpperCase() === 'ABSENT').length;
    const totalLates = att.filter((a) => String(a.status ?? '').toUpperCase() === 'LATE').length;
    const totalRecords = att.length;
    const attended = att.filter((a) => String(a.status ?? '').toUpperCase() !== 'ABSENT').length;
    const attendancePercentage = totalRecords > 0 ? Math.round((attended / totalRecords) * 100) : 0;

    const courseRows = (Array.isArray(courses) ? courses : []).map((row) => {
      const a = row as Record<string, unknown>;
      const course = (a['course'] as Record<string, unknown>) ?? {};
      const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
      const user = (teacher['user'] as Record<string, unknown>) ?? {};
      const teacherName = `${user['firstName'] ?? ''} ${user['lastName'] ?? ''}`.trim();
      return {
        id: String(a['id'] ?? ''),
        name: String(course['name'] ?? 'Curso'),
        teacher: teacherName || '—',
      };
    }).filter((row) => row.id);
    const totalCourses = courseRows.length;

    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      GRADUATED: 'Egresado',
      WITHDRAWN: 'Retirado',
      SUSPENDED: 'Suspendido',
    };
    const st = detail.status ?? 'ACTIVE';
    const grade = (detail.grade ?? en?.section?.grade ?? '').trim();
    const level = (detail.level ?? en?.section?.level ?? '').trim();

    return {
      name: detail.name ?? `${detail.user.firstName} ${detail.user.lastName}`,
      gradeLine: [grade, level].filter(Boolean).join(' · ') || '—',
      code: detail.code ?? detail.studentCode,
      status: statusMap[st] ?? st,
      academicYear: en?.academicYear?.name ?? '—',
      enrollmentDate: en?.enrolledAt ?? null,
      photo: detail.photo,
      email: detail.user?.email,
      birthDate: detail.birthDate,
      gender: detail.gender,
      address: detail.address,
      bloodType: detail.bloodType,
      medicalNotes: detail.medicalNotes,
      academicSummary: {
        overallAverage,
        completedTasks,
        totalTasks,
        pendingTasks,
        attendancePercentage,
        totalCourses,
        totalAbsences,
        totalLates,
      },
      courses: courseRows,
    };
  }

  getChildName(child: Child): string {
    return `${child.user.firstName} ${child.user.lastName}`;
  }

  getChildGrade(child: Child): string {
    const grade = (child.grade ?? child.enrollments?.[0]?.section?.grade ?? '').trim();
    const level = (child.level ?? child.enrollments?.[0]?.section?.level ?? '').trim();
    return [grade, level].filter(Boolean).join(' · ');
  }

  getChildCode(child: Child): string {
    return child.code ?? child.studentCode ?? '';
  }

  getChildInitial(child: Child): string {
    const fn = child.user?.firstName?.charAt(0) ?? '';
    const ln = child.user?.lastName?.charAt(0) ?? '';
    return (fn + ln).toUpperCase() || '?';
  }

  profileInitials(profile: ChildProfileVm): string {
    const parts = profile.name.split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  formatDate(raw?: string | Date | null): string {
    if (!raw) return '—';
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? String(raw)
      : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatGender(raw?: string): string {
    const v = (raw ?? '').trim().toUpperCase();
    if (!v) return '—';
    if (['M', 'MALE', 'MASCULINO', 'HOMBRE'].includes(v)) return 'Masculino';
    if (['F', 'FEMALE', 'FEMENINO', 'MUJER'].includes(v)) return 'Femenino';
    return raw!.trim();
  }

  averageBarWidth(avg: number | null): number {
    if (avg == null || Number.isNaN(avg)) return 0;
    return Math.min(100, Math.max(0, (avg / 20) * 100));
  }
}
