import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { StudentService, StudentTask } from '../../../services/student.service';

@Component({
  selector: 'app-tarea-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tarea-detalle.component.html',
  styleUrl: './tarea-detalle.component.css'
})
export class TareaDetalleComponent implements OnInit {
  taskId = signal('');
  loading = signal(true);
  error = signal('');
  submitting = signal(false);
  submitSuccess = signal('');
  submitError = signal('');
  showSubmitConfirmation = signal(false);
  readonly isLoading = this.loading;

  task = signal<StudentTask | null>(null);
  submissionContent = signal('');
  selectedFiles: File[] = [];

  constructor(private route: ActivatedRoute, private studentService: StudentService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.taskId.set(id);
    this.studentService.getTask(id).subscribe({
      next: (data) => { this.task.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar la tarea'); this.loading.set(false); }
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files ?? []);
  }

  submit() {
    this.submitting.set(true);
    this.submitError.set('');
    const fd = new FormData();
    if (this.submissionContent()) fd.append('content', this.submissionContent());
    this.selectedFiles.forEach(f => fd.append('files', f));

    this.studentService.submitTask(this.taskId(), fd).subscribe({
      next: () => {
        this.submitSuccess.set('Tarea entregada correctamente');
        this.submitting.set(false);
        this.studentService.getTask(this.taskId()).subscribe({ next: (data) => this.task.set(data) });
      },
      error: (err) => {
        this.submitError.set(err?.error?.error?.message ?? 'Error al entregar la tarea');
        this.submitting.set(false);
      }
    });
  }

  downloadMaterial(fileId: string) {
    window.open(this.studentService.getTaskMaterialDownloadUrl(this.taskId(), fileId));
  }

  hasSubmission(): boolean { return !!this.task()?.submission; }
}
