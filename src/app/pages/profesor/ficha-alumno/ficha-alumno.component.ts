import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { GradeEntry, TeacherCourse, TeacherService } from '../../../services/teacher.service';

export interface ProfesorFichaAlumnoView {
  student: {
    name: string;
    code: string;
    email: string;
    tutor: string;
    tutorEmail: string;
    tutorPhone: string;
  };
  course: {
    name: string;
    grade: string;
    section: string;
  };
  academic: {
    average: string | number;
    attendancePercentage: number | null;
    totalSessions: number | null;
    totalAbsences: number | null;
    totalLates: number | null;
    totalJustified: number | null;
  };
}

@Component({
  selector: 'app-ficha-alumno',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ficha-alumno.component.html',
  styleUrl: './ficha-alumno.component.css',
})
export class FichaAlumnoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  courseId = signal('');
  studentId = signal('');
  studentData = signal<ProfesorFichaAlumnoView | null>(null);

  readonly isLoading = this.loading;

  student = computed(() => this.studentData()?.student ?? ({} as ProfesorFichaAlumnoView['student']));
  course = computed(() => this.studentData()?.course ?? ({} as ProfesorFichaAlumnoView['course']));
  academicData = computed(() => this.studentData()?.academic ?? ({} as ProfesorFichaAlumnoView['academic']));

  /** Porcentaje de asistencia o texto si no hay registros. */
  attendanceLabel = computed(() => {
    const a = this.academicData();
    if (a.totalSessions === 0) return 'Sin registros';
    if (a.attendancePercentage == null) return '—';
    return `${a.attendancePercentage}%`;
  });

  hasAttendanceRecords = computed(() => (this.academicData().totalSessions ?? 0) > 0);

  constructor(
    private route: ActivatedRoute,
    private teacherService: TeacherService,
  ) {}

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const sId = this.route.snapshot.paramMap.get('studentId') ?? '';
    this.courseId.set(cId);
    this.studentId.set(sId);
    if (!cId || !sId) {
      this.error.set('Ruta no válida.');
      this.loading.set(false);
      return;
    }

    this.teacherService
      .getStudentFicha(cId, sId)
      .pipe(
        switchMap((rawStudent) => {
          const studentRecord = this.unwrapStudentRecord(rawStudent);
          const sid = String(studentRecord['id'] ?? sId);

          return forkJoin({
            studentRecord: of(studentRecord),
            course: this.teacherService.getCourse(cId).pipe(catchError(() => of(null))),
            grades: this.teacherService.getGrades(cId).pipe(catchError(() => of([] as GradeEntry[]))),
          }).pipe(
            switchMap(({ studentRecord: st, course, grades }) =>
              of(this.assembleFicha(st, course, grades, sid)),
            ),
          );
        }),
      )
      .subscribe({
        next: (view) => {
          this.studentData.set(view);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar ficha del alumno');
          this.loading.set(false);
        },
      });
  }

  private unwrapStudentRecord(raw: unknown): Record<string, unknown> {
    const r = raw as Record<string, unknown> | null;
    if (!r || typeof r !== 'object') return {};
    const nested = r['student'];
    if (nested && typeof nested === 'object') {
      return { ...(nested as Record<string, unknown>), ...r };
    }
    return r;
  }

  private pickPrimaryParent(st: Record<string, unknown>): {
    name: string;
    email: string;
    phone: string;
  } {
    const links = st['parentLinks'] as unknown;
    if (!Array.isArray(links) || links.length === 0) {
      return { name: '—', email: '—', phone: '—' };
    }
    const sorted = [...links].sort((a, b) => {
      const ap = Boolean((a as Record<string, unknown>)['isPrimary']);
      const bp = Boolean((b as Record<string, unknown>)['isPrimary']);
      if (ap === bp) return 0;
      return ap ? -1 : 1;
    });
    const link = sorted[0] as Record<string, unknown>;
    const parent = link['parent'] as Record<string, unknown> | undefined;
    const u = (parent?.['user'] as Record<string, unknown> | undefined) ?? {};
    const first = String(u['firstName'] ?? '').trim();
    const last = String(u['lastName'] ?? '').trim();
    const name = `${first} ${last}`.trim() || '—';
    const email = String(u['email'] ?? '').trim() || '—';
    const phone = String(u['phone'] ?? '').trim() || '—';
    return { name, email, phone };
  }

  private readAttendanceSummary(st: Record<string, unknown>): {
    percentage: number | null;
    totalSessions: number;
    absent: number | null;
    late: number | null;
    justified: number | null;
  } {
    const sum = st['attendanceSummary'] as Record<string, unknown> | undefined;
    if (!sum || typeof sum !== 'object') {
      return {
        percentage: null,
        totalSessions: 0,
        absent: null,
        late: null,
        justified: null,
      };
    }
    const total = Number(sum['totalSessions'] ?? 0);
    const pct = sum['percentage'];
    return {
      percentage:
        pct != null && pct !== '' && Number.isFinite(Number(pct)) ? Number(pct) : null,
      totalSessions: Number.isFinite(total) ? total : 0,
      absent:
        sum['absent'] != null && Number.isFinite(Number(sum['absent']))
          ? Number(sum['absent'])
          : null,
      late:
        sum['late'] != null && Number.isFinite(Number(sum['late']))
          ? Number(sum['late'])
          : null,
      justified:
        sum['justified'] != null && Number.isFinite(Number(sum['justified']))
          ? Number(sum['justified'])
          : null,
    };
  }

  private assembleFicha(
    st: Record<string, unknown>,
    course: TeacherCourse | null,
    grades: GradeEntry[],
    studentId: string,
  ): ProfesorFichaAlumnoView {
    const u = (st['user'] as Record<string, unknown> | undefined) ?? {};
    const first = String(u['firstName'] ?? '').trim();
    const last = String(u['lastName'] ?? '').trim();
    const name = `${first} ${last}`.trim() || '(sin nombre)';
    const code = String(st['studentCode'] ?? st['code'] ?? '').trim();
    const email = String(u['email'] ?? '').trim();

    const tc = course;
    const courseName = tc?.course?.name ?? tc?.name ?? '—';
    const gradeLbl = String(tc?.course?.grade ?? tc?.grade ?? '').trim();
    const levelLbl = String(tc?.course?.level ?? '').trim();
    const sectionLine = [gradeLbl, levelLbl].filter(Boolean).join(' · ') || '—';

    const studentGrades = grades.filter((g) => (g.student?.id ?? '') === studentId);
    const avg =
      studentGrades.length > 0
        ? Math.round(
            (studentGrades.reduce((s, g) => s + Number(g.score), 0) /
              studentGrades.length) *
              10,
          ) / 10
        : '—';

    const primary = this.pickPrimaryParent(st);
    const att = this.readAttendanceSummary(st);

    return {
      student: {
        name,
        code,
        email: email || '—',
        tutor: primary.name,
        tutorEmail: primary.email,
        tutorPhone: primary.phone,
      },
      course: {
        name: courseName,
        grade: gradeLbl || '—',
        section: sectionLine,
      },
      academic: {
        average: avg,
        attendancePercentage: att.totalSessions > 0 ? att.percentage : null,
        totalSessions: att.totalSessions,
        totalAbsences: att.absent,
        totalLates: att.late,
        totalJustified: att.justified,
      },
    };
  }

  metricOrDash(v: number | null | undefined): string | number {
    return v == null ? '—' : v;
  }
}
