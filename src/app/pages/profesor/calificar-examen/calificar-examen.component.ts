import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  TeacherExam,
  TeacherService,
  filterTeacherRosterByCourseGrade,
} from '../../../services/teacher.service';

interface ExamStudent {
  id: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-calificar-examen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificar-examen.component.html',
  styleUrl: './calificar-examen.component.css',
})
export class CalificarExamenComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherService = inject(TeacherService);

  courseId = signal('');
  examId = signal('');
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  courseLabel = signal('');
  exam = signal<TeacherExam | null>(null);
  students = signal<ExamStudent[]>([]);
  draftScores = signal<Record<string, string>>({});

  filledCount = computed(() => {
    const exam = this.exam();
    if (!exam) return 0;
    return this.students().filter(s => this.scoreOf(s.id) != null).length;
  });

  average = computed(() => {
    const scores = this.students()
      .map(s => this.scoreOf(s.id))
      .filter((n): n is number => n != null);
    if (!scores.length) return null;
    return Math.round((scores.reduce((sum, n) => sum + n, 0) / scores.length) * 10) / 10;
  });

  dirty = computed(() => {
    const exam = this.exam();
    if (!exam) return false;
    return Object.entries(this.draftScores()).some(([studentId, raw]) => {
      const saved = this.savedScore(studentId);
      const parsed = this.parseScore(raw, exam.maxScore);
      if (raw.trim() === '') return false;
      return parsed !== saved;
    });
  });

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const eId = this.route.snapshot.paramMap.get('examId') ?? '';
    this.courseId.set(cId);
    this.examId.set(eId);
    if (!cId || !eId) {
      this.error.set('No se identificó el examen.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  cancel() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'examenes' } });
  }

  periodInput(studentId: string): string {
    const drafts = this.draftScores();
    if (Object.prototype.hasOwnProperty.call(drafts, studentId)) return drafts[studentId];
    const n = this.savedScore(studentId);
    return n == null ? '' : String(n);
  }

  setDraftScore(studentId: string, value: string | number) {
    this.draftScores.update(d => ({ ...d, [studentId]: String(value ?? '') }));
    this.success.set('');
  }

  saveScores() {
    const exam = this.exam();
    if (!exam || this.saving()) return;
    const records: { studentId: string; score: number }[] = [];
    for (const student of this.students()) {
      const raw = this.periodInput(student.id).trim();
      if (!raw) continue;
      const score = this.parseScore(raw, exam.maxScore);
      if (score == null) {
        this.error.set(`La nota debe estar entre 0 y ${exam.maxScore}.`);
        return;
      }
      records.push({ studentId: student.id, score });
    }
    if (!records.length) {
      this.error.set('Escribe al menos una nota para guardar.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.teacherService.saveExamScores(this.courseId(), exam.id, { records }).subscribe({
      next: (updated) => {
        this.exam.set(updated);
        this.draftScores.set({});
        this.saving.set(false);
        this.success.set('Notas del examen guardadas.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.extractHttpError(err));
      },
    });
  }

  private load() {
    const cId = this.courseId();
    this.loading.set(true);
    this.teacherService.getCourse(cId).subscribe({
      next: (course) => {
        const name = course.course?.name ?? '';
        const grade = (course.course?.grade ?? '').trim();
        const level = (course.course?.level ?? '').trim();
        this.courseLabel.set([name, [grade, level].filter(Boolean).join(' · ')].filter(Boolean).join(' · '));
        this.teacherService.getStudentsInCourse(cId, {
          ...(grade ? { grade } : {}),
          ...(level ? { level } : {}),
        }).subscribe({
          next: (data) => {
            const rows = filterTeacherRosterByCourseGrade(data as unknown[], grade, level);
            this.students.set(this.normalizeStudents(rows));
          },
          error: () => this.students.set([]),
        });
      },
    });

    this.teacherService.getExam(cId, this.examId()).subscribe({
      next: (exam) => {
        this.exam.set(exam);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.extractHttpError(err));
        this.loading.set(false);
      },
    });
  }

  private savedScore(studentId: string): number | null {
    const score = this.exam()?.scores?.find(s => (s.studentId ?? s.student?.id) === studentId)?.score;
    return typeof score === 'number' && Number.isFinite(score) ? score : null;
  }

  private scoreOf(studentId: string): number | null {
    const raw = this.periodInput(studentId).trim();
    if (!raw) return this.savedScore(studentId);
    return this.parseScore(raw, this.exam()?.maxScore ?? 20);
  }

  private parseScore(raw: string, max: number): number | null {
    const n = Number(String(raw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > max) return null;
    return Math.round(n * 10) / 10;
  }

  private normalizeStudents(raw: unknown[]): ExamStudent[] {
    return (raw ?? []).map((r: any) => {
      const s = r?.student ?? r;
      const u = s?.user ?? r?.user ?? {};
      const first = u.firstName ?? s?.firstName ?? '';
      const last = u.lastName ?? s?.lastName ?? '';
      return {
        id: s?.id ?? r?.studentId ?? r?.id ?? '',
        code: s?.studentCode ?? s?.code ?? '',
        name: `${first} ${last}`.trim() || s?.name || '(sin nombre)',
      };
    }).filter(s => s.id).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  private extractHttpError(err: unknown): string {
    const e = err as { error?: { message?: string | string[]; error?: { message?: string } }; message?: string };
    const nested = e?.error?.error?.message;
    const raw =
      (typeof nested === 'string' && nested.trim() ? nested : '') ||
      (Array.isArray(e?.error?.message) ? e.error!.message!.filter(Boolean).join('. ') : '') ||
      (typeof e?.error?.message === 'string' ? e.error.message : '') ||
      (typeof e?.message === 'string' ? e.message : '');
    return raw.trim() || 'No se pudieron guardar las notas.';
  }
}
