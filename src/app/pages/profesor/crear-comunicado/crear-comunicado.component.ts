import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

interface Course {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
}

@Component({
  selector: 'app-crear-comunicado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-comunicado.component.html',
  styleUrl: './crear-comunicado.component.css'
})
export class CrearComunicadoComponent implements OnInit {
  courseId = signal<string | null>(null);
  comunicadoId = signal<string | null>(null);
  isEditMode = signal(false);
  isSaving = signal(false);
  
  course = signal<Course | null>(null);
  isLoading = signal(true);

  // Campos del formulario
  title = signal('');
  content = signal('');
  priority = signal<'urgente' | 'importante' | 'normal'>('normal');
  publishDate = signal<string>('');
  attachments = signal<AttachmentFile[]>([]);
  saveAsDraft = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      if (params['comunicadoId'] && params['comunicadoId'] !== 'nuevo') {
        this.comunicadoId.set(params['comunicadoId']);
        this.isEditMode.set(true);
      }
      this.loadCourse();
    });

    // Establecer fecha de publicación por defecto (hoy)
    const today = new Date();
    this.publishDate.set(today.toISOString().split('T')[0]);
  }

  loadCourse() {
    this.isLoading.set(true);
    // Simulación de carga de datos
    setTimeout(() => {
      const mockCourse: Course = {
        id: this.courseId()!,
        name: 'Matemática',
        code: 'MAT-2024',
        grade: '3ro',
        section: 'A'
      };

      this.course.set(mockCourse);
      this.isLoading.set(false);

      // Si es modo edición, cargar datos del comunicado
      if (this.isEditMode()) {
        this.loadComunicado();
      }
    }, 500);
  }

  loadComunicado() {
    // Simulación de carga de comunicado existente
    setTimeout(() => {
      this.title.set('Recordatorio: Examen Parcial');
      this.content.set('Se les recuerda a todos los estudiantes que el examen parcial se realizará el próximo viernes...');
      this.priority.set('urgente');
      this.publishDate.set('2024-03-18');
      this.saveAsDraft.set(false);
    }, 300);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      files.forEach(file => {
        const attachment: AttachmentFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          file: file
        };
        this.attachments.update(attachments => [...attachments, attachment]);
      });
    }
    input.value = '';
  }

  removeAttachment(id: string) {
    this.attachments.update(attachments => 
      attachments.filter(att => att.id !== id)
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  canSave(): boolean {
    return this.title().trim().length > 0 && 
           this.content().trim().length > 0 &&
           this.publishDate().length > 0;
  }

  saveComunicado() {
    if (!this.canSave()) {
      return;
    }

    this.isSaving.set(true);

    const comunicadoData = {
      courseId: this.courseId()!,
      title: this.title(),
      content: this.content(),
      priority: this.priority(),
      publishDate: this.publishDate(),
      status: this.saveAsDraft() ? 'borrador' : 'publicado',
      attachments: this.attachments().map(att => ({
        name: att.name,
        size: att.size,
        type: att.type
      }))
    };

    // Simulación de guardado
    setTimeout(() => {
      console.log('Guardando comunicado:', comunicadoData);
      this.isSaving.set(false);
      this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'comunicados' } });
    }, 1000);
  }

  cancel() {
    this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'comunicados' } });
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'urgente': return 'badge-urgent';
      case 'importante': return 'badge-important';
      case 'normal': return 'badge-normal';
      default: return 'badge-normal';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'urgente': return 'Urgente';
      case 'importante': return 'Importante';
      case 'normal': return 'Normal';
      default: return priority;
    }
  }
}
