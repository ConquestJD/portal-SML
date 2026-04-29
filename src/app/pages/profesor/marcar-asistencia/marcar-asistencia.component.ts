import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TeacherService, AttendanceRecord, filterTeacherRosterByCourseGrade } from '../../../services/teacher.service';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';

interface StudentAttendance {
  studentId: string;
  name: string;
  studentCode: string;
  status: AttendanceStatus;
  notes: string;
}

@Component({
  selector: 'app-marcar-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './marcar-asistencia.component.html',
  styleUrl: './marcar-asistencia.component.css'
})
export class MarcarAsistenciaComponent implements OnInit {
  courseId = signal('');
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  readonly isLoading = this.loading;

  students = signal<StudentAttendance[]>([]);

  attendanceSummary = computed(() => {
    const list = this.students();
    const present = list.filter(s => s.status === 'PRESENT').length;
    const absent = list.filter(s => s.status === 'ABSENT').length;
    const late = list.filter(s => s.status === 'LATE').length;
    const total = list.length;
    return { present, absent, late, total, percentage: total > 0 ? Math.round(present / total * 100) : 0 };
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService
  ) {}

  ngOnInit() {
    this.courseId.set(this.route.snapshot.paramMap.get('courseId') ?? '');
    this.loadStudents();
  }

  loadStudents() {
    const cid = this.courseId();
    this.loading.set(true);
    this.error.set('');
    this.teacherService.getCourse(cid).subscribe({
      next: (course) => {
        const grade = (course.course?.grade ?? '').trim();
        const level = (course.course?.level ?? '').trim();
        this.teacherService
          .getStudentsInCourse(cid, {
            ...(grade ? { grade } : {}),
            ...(level ? { level } : {}),
          })
          .subscribe({
            next: (data: any[]) => {
              const rows = filterTeacherRosterByCourseGrade(data, grade, level);
              this.applyLoadedStudents(rows as any[]);
            },
            error: () => {
              this.error.set('Error al cargar estudiantes');
              this.loading.set(false);
            },
          });
      },
      error: () => {
        this.error.set('Error al cargar el curso');
        this.loading.set(false);
      },
    });
  }

  private applyLoadedStudents(data: any[]) {
    this.students.set(
      (data ?? []).map(s => {
        const st = s?.student ?? s;
        const u = st?.user ?? s?.user ?? {};
        const id = st?.id ?? s?.studentId ?? s?.id ?? '';
        return {
          studentId: id,
          name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || st?.name || '',
          studentCode: st?.studentCode ?? s?.studentCode ?? '',
          status: 'PRESENT' as AttendanceStatus,
          notes: '',
        };
      })
    );
    this.loading.set(false);
    this.loadExistingAttendance();
  }

  loadExistingAttendance() {
    this.teacherService.getAttendanceByDate(this.courseId(), this.selectedDate()).subscribe({
      next: (existing: any[]) => {
        if (existing?.length) {
          this.students.update(list => list.map(s => {
            const match = existing.find((e: any) => e.student?.id === s.studentId);
            if (match) return { ...s, status: match.status, notes: match.notes ?? '' };
            return s;
          }));
        }
      }
    });
  }

  onDateChange() { this.loadExistingAttendance(); }

  setStatus(studentId: string, status: AttendanceStatus) {
    this.students.update(list => list.map(s => s.studentId === studentId ? { ...s, status } : s));
  }

  setNotes(studentId: string, notes: string) {
    this.students.update(list => list.map(s => s.studentId === studentId ? { ...s, notes } : s));
  }

  setAllPresent() {
    this.students.update(list => list.map(s => ({ ...s, status: 'PRESENT' as AttendanceStatus })));
  }

  save() {
    this.saving.set(true);
    this.error.set('');
    const records: AttendanceRecord[] = this.students().map(s => ({
      studentId: s.studentId,
      date: this.selectedDate(),
      status: s.status,
      notes: s.notes || undefined
    }));
    this.teacherService.saveAttendance(this.courseId(), records).subscribe({
      next: () => {
        this.success.set('Asistencia guardada correctamente');
        this.saving.set(false);
        setTimeout(() => this.router.navigate([`/profesor/cursos/${this.courseId()}`]), 1500);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Error al guardar asistencia');
        this.saving.set(false);
      }
    });
  }

  getPresentCount(): number { return this.students().filter(s => s.status === 'PRESENT').length; }
  getAbsentCount(): number { return this.students().filter(s => s.status === 'ABSENT').length; }
  getLateCount(): number { return this.students().filter(s => s.status === 'LATE').length; }
}
