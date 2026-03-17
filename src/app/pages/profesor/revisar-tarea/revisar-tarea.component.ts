import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherTask, TaskSubmission } from '../../../services/teacher.service';

@Component({
  selector: 'app-revisar-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './revisar-tarea.component.html',
  styleUrl: './revisar-tarea.component.css'
})
export class RevisarTareaComponent implements OnInit {
  courseId = signal('');
  taskId = signal('');
  loading = signal(true);
  error = signal('');
  filterStatus = signal('');
  searchQuery = signal('');
  readonly isLoading = this.loading;

  task = signal<TeacherTask | null>(null);
  submissions = signal<TaskSubmission[]>([]);
  selectedSubmission = signal<TaskSubmission | null>(null);

  gradeForm = signal({ score: 0, feedback: '' });
  saving = signal(false);
  showGradingModal = signal(false);

  constructor(private route: ActivatedRoute, private teacherService: TeacherService) {}

  ngOnInit() {
    this.courseId.set(this.route.snapshot.paramMap.get('courseId') ?? '');
    this.taskId.set(this.route.snapshot.paramMap.get('taskId') ?? '');
    this.loadTask();
    this.loadSubmissions();
  }

  loadTask() {
    this.teacherService.getTask(this.courseId(), this.taskId()).subscribe({
      next: (data) => this.task.set(data)
    });
  }

  loadSubmissions() {
    this.loading.set(true);
    this.teacherService.getSubmissions(this.courseId(), this.taskId(), {
      status: this.filterStatus() || undefined,
      search: this.searchQuery() || undefined
    }).subscribe({
      next: (data) => { this.submissions.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar entregas'); this.loading.set(false); }
    });
  }

  openGradeModal(sub: TaskSubmission) {
    this.selectedSubmission.set(sub);
    this.gradeForm.set({ score: sub.score ?? 0, feedback: sub.feedback ?? '' });
    this.showGradingModal.set(true);
  }
  closeGradeModal() { this.selectedSubmission.set(null); this.showGradingModal.set(false); }

  saveGrade() {
    const sub = this.selectedSubmission();
    if (!sub) return;
    this.saving.set(true);
    const { score, feedback } = this.gradeForm();
    this.teacherService.gradeSubmission(this.courseId(), this.taskId(), sub.id, score, feedback).subscribe({
      next: (updated) => {
        this.submissions.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.selectedSubmission.set(null);
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  getStudentName(sub: TaskSubmission): string {
    return `${sub.student.user.firstName} ${sub.student.user.lastName}`;
  }

  updateGradeForm(field: string, value: unknown) { this.gradeForm.update(d => ({ ...d, [field]: value })); }
}
