import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AcademicPeriod, TeacherService } from '../../../services/teacher.service';

@Component({
  selector: 'app-crear-examen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-examen.component.html',
  styleUrl: './crear-examen.component.css',
})
export class CrearExamenComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherService = inject(TeacherService);

  courseId = signal('');
  examId = signal('');
  isEditMode = signal(false);
  isSaving = signal(false);
  error = signal('');
  courseLabel = signal('');
  periods = signal<AcademicPeriod[]>([]);

  title = signal('');
  description = signal('');
  examDate = signal(this.todayDate());
  examTime = signal('08:00');
  periodId = signal('');

  pageTitle = computed(() => this.isEditMode() ? 'Editar examen' : 'Nuevo examen');
  canSave = computed(() => !!this.title().trim() && !!this.examDate().trim());

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const eId = this.route.snapshot.paramMap.get('examId') ?? '';
    this.courseId.set(cId);

    if (cId) {
      this.teacherService.getCourse(cId).subscribe({
        next: (c) => {
          const name = c.course?.name ?? '';
          const grade = (c.course?.grade ?? '').trim();
          const level = (c.course?.level ?? '').trim();
          this.courseLabel.set([name, [grade, level].filter(Boolean).join(' · ')].filter(Boolean).join(' · '));
        },
      });
      this.teacherService.getCoursePeriods(cId).subscribe({
        next: (periods) => this.periods.set(periods ?? []),
      });
    }

    if (eId && eId !== 'nuevo') {
      this.examId.set(eId);
      this.isEditMode.set(true);
      this.loadExam(eId);
    }
  }

  cancel() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'examenes' } });
  }

  saveExam() {
    if (!this.canSave() || this.isSaving()) return;
    const examDate = this.examDateToIso();
    if (!examDate) {
      this.error.set('La fecha del examen no es válida.');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    const dto = {
      title: this.title().trim(),
      description: this.description().trim(),
      examDate,
      maxScore: 20,
      periodId: this.periodId().trim() || null,
    };

    const req = this.isEditMode()
      ? this.teacherService.updateExam(this.courseId(), this.examId(), dto)
      : this.teacherService.createExam(this.courseId(), dto);

    req.subscribe({
      next: (exam) => {
        this.isSaving.set(false);
        if (this.isEditMode()) {
          this.cancel();
        } else {
          void this.router.navigate(['/profesor/cursos', this.courseId(), 'examenes', exam.id, 'calificar']);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(this.extractHttpError(err));
      },
    });
  }

  private loadExam(examId: string) {
    this.teacherService.getExam(this.courseId(), examId).subscribe({
      next: (exam) => {
        this.title.set(exam.title);
        this.description.set(exam.description ?? '');
        this.periodId.set(exam.periodId ?? exam.period?.id ?? '');
        const split = this.splitDate(exam.examDate);
        this.examDate.set(split.date);
        this.examTime.set(split.time);
      },
      error: (err) => this.error.set(this.extractHttpError(err)),
    });
  }

  private todayDate(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private splitDate(iso: string): { date: string; time: string } {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return { date: (iso.split('T')[0] ?? '').slice(0, 10), time: '08:00' };
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }

  private examDateToIso(): string | undefined {
    const day = this.examDate().trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
    const time = /^\d{2}:\d{2}$/.test(this.examTime().trim()) ? this.examTime().trim() : '08:00';
    const d = new Date(`${day}T${time}:00`);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }

  private extractHttpError(err: unknown): string {
    const e = err as { error?: { message?: string | string[]; error?: { message?: string } }; message?: string };
    const nested = e?.error?.error?.message;
    const raw =
      (typeof nested === 'string' && nested.trim() ? nested : '') ||
      (Array.isArray(e?.error?.message) ? e.error!.message!.filter(Boolean).join('. ') : '') ||
      (typeof e?.error?.message === 'string' ? e.error.message : '') ||
      (typeof e?.message === 'string' ? e.message : '');
    return raw.trim() || 'No se pudo guardar el examen.';
  }
}
