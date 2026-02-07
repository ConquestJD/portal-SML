import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

@Component({
  selector: 'app-crear-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-tarea.component.html',
  styleUrl: './crear-tarea.component.css'
})
export class CrearTareaComponent {
  courseId = signal('');
  taskId = signal<string | null>(null);
  isEditMode = signal(false);
  isSaving = signal(false);

  // Campos principales - simplificados
  title = signal('');
  instructions = signal('');
  dueDate = signal('');
  points = signal(100);
  deliveryType = signal<'archivo' | 'texto' | 'ambos'>('archivo');
  
  // Opciones avanzadas (colapsables)
  showAdvanced = signal(false);
  allowLateDelivery = signal(false);
  rubric = signal('');
  
  // Archivos adjuntos
  attachments = signal<AttachmentFile[]>([]);

  // Valores por defecto útiles
  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      if (params['taskId'] && params['taskId'] !== 'nueva') {
        this.taskId.set(params['taskId']);
        this.isEditMode.set(true);
        // Cargar datos de la tarea existente
      } else {
        // Establecer fecha límite por defecto (7 días desde hoy)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        this.dueDate.set(this.formatDateTimeLocal(defaultDate));
      }
    });
  }

  formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    // Limpiar el input
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

  toggleAdvanced() {
    this.showAdvanced.update(val => !val);
  }

  canSave = computed(() => {
    return this.title().trim().length > 0 && 
           this.instructions().trim().length > 0 && 
           this.dueDate().length > 0;
  });

  saveTask() {
    if (!this.canSave()) {
      return;
    }

    this.isSaving.set(true);
    
    const taskData = {
      title: this.title(),
      instructions: this.instructions(),
      dueDate: this.dueDate(),
      points: this.points(),
      deliveryType: this.deliveryType(),
      allowLateDelivery: this.allowLateDelivery(),
      rubric: this.rubric() || undefined,
      attachments: this.attachments().map(att => ({
        name: att.name,
        size: att.size,
        type: att.type
      }))
    };

    // Simulación de guardado
    setTimeout(() => {
      console.log('Guardando tarea:', taskData);
      this.isSaving.set(false);
      // Redirigir al curso después de guardar
      this.router.navigate(['/profesor/cursos', this.courseId()]);
    }, 1000);
  }

  cancel() {
    this.router.navigate(['/profesor/cursos', this.courseId()]);
  }
}
