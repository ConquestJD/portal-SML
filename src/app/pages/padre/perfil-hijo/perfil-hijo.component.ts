import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService, Child } from '../../../services/parent.service';

export interface ChildProfileVm {
  name: string;
  grade: string;
  section: string;
  code: string;
  status: string;
  academicYear: string;
  enrollmentDate: string | Date | null;
  photo?: string;
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
  tutor: { name: string; email: string; phone: string };
  coordinator: { name: string; email: string; phone: string };
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
  activeTab = signal<'resumen' | 'academico' | 'contacto'>('resumen');

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

  setTab(tab: 'resumen' | 'academico' | 'contacto') {
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
    const totalAbsences = att.filter((a) => a.status === 'ABSENT').length;
    const totalLates = att.filter((a) => a.status === 'LATE').length;
    const totalRecords = att.length;
    const attended = att.filter((a) => a.status !== 'ABSENT').length;
    const attendancePercentage = totalRecords > 0 ? Math.round((attended / totalRecords) * 100) : 0;

    const totalCourses = Array.isArray(courses) ? courses.length : 0;

    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      GRADUATED: 'Egresado',
      WITHDRAWN: 'Retirado',
      SUSPENDED: 'Suspendido',
    };
    const st = detail.status ?? 'ACTIVE';

    return {
      name: detail.name ?? `${detail.user.firstName} ${detail.user.lastName}`,
      grade: detail.grade ?? en?.section?.grade ?? '—',
      section: detail.section ?? en?.section?.name ?? '—',
      code: detail.code ?? detail.studentCode,
      status: statusMap[st] ?? st,
      academicYear: en?.academicYear?.name ?? '—',
      enrollmentDate: en?.enrolledAt ?? null,
      photo: detail.photo,
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
      tutor: {
        name: 'Consultar en secretaría',
        email: '',
        phone: '',
      },
      coordinator: {
        name: 'Consultar en secretaría',
        email: '',
        phone: '',
      },
    };
  }

  getChildName(child: Child): string {
    return `${child.user.firstName} ${child.user.lastName}`;
  }

  getChildGrade(child: Child): string {
    return child.grade ?? child.enrollments?.[0]?.section?.grade ?? '';
  }

  getChildCode(child: Child): string {
    return child.code ?? child.studentCode ?? '';
  }

  getChildInitial(child: Child): string {
    const fn = child.user?.firstName?.charAt(0) ?? '';
    const ln = child.user?.lastName?.charAt(0) ?? '';
    return (fn + ln).toUpperCase() || '?';
  }

  averageBarWidth(avg: number | null): number {
    if (avg == null || Number.isNaN(avg)) return 0;
    return Math.min(100, Math.max(0, (avg / 20) * 100));
  }
}
