import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface TaskDetail {
  id: string;
  name: string;
  description: string;
  instructions: string;
  course: string;
  courseCode: string;
  teacher: string;
  teacherPhoto?: string;
  dueDate: string;
  assignedDate: string;
  status: 'pendiente' | 'entregada' | 'vencida' | 'en-revision';
  points: number;
  grade?: number;
  feedback?: string;
  materials: Material[];
  rubric?: RubricItem[];
  submission?: Submission;
  submissionHistory?: Submission[];
}

interface Material {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
}

interface RubricItem {
  criterion: string;
  description: string;
  points: number;
}

interface Submission {
  id: string;
  submittedAt: string;
  text: string;
  files: FileItem[];
  status: 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
}

interface FileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

@Component({
  selector: 'app-tarea-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './tarea-detalle.component.html',
  styleUrl: './tarea-detalle.component.css'
})
export class TareaDetalleComponent implements OnInit {
  taskId = signal<string>('');
  task = signal<TaskDetail | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  
  // Formulario de entrega
  submissionText = signal('');
  uploadedFiles = signal<File[]>([]);
  showSubmitConfirmation = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.taskId.set(params['id']);
      this.loadTask();
    });
  }

  loadTask() {
    this.isLoading.set(true);
    
    // Simulación de carga de datos - en producción esto vendría de un servicio
    setTimeout(() => {
      const mockTask: TaskDetail = {
        id: this.taskId(),
        name: 'Proyecto de Matemática - Álgebra',
        description: 'Este proyecto tiene como objetivo aplicar los conceptos de álgebra aprendidos en clase para resolver problemas del mundo real.',
        instructions: `
          <ol>
            <li>Revisa los materiales de referencia proporcionados</li>
            <li>Resuelve los 5 problemas planteados en el documento adjunto</li>
            <li>Incluye todos los pasos de tu solución</li>
            <li>Presenta tu trabajo de forma clara y organizada</li>
            <li>Entrega antes de la fecha límite</li>
          </ol>
        `,
        course: 'Matemática',
        courseCode: 'MAT-2024',
        teacher: 'Prof. Carlos Rodríguez',
        teacherPhoto: 'https://via.placeholder.com/40',
        dueDate: '2024-03-25',
        assignedDate: '2024-03-10',
        status: 'pendiente',
        points: 50,
        materials: [
          {
            id: '1',
            name: 'Guía de Problemas - Álgebra',
            type: 'PDF',
            size: '2.5 MB',
            url: '#'
          },
          {
            id: '2',
            name: 'Video: Resolución de Ecuaciones',
            type: 'Video',
            size: '45 MB',
            url: '#'
          },
          {
            id: '3',
            name: 'Ejemplos Resueltos',
            type: 'PDF',
            size: '1.2 MB',
            url: '#'
          }
        ],
        rubric: [
          {
            criterion: 'Comprensión del Problema',
            description: 'Demuestra comprensión clara del problema planteado',
            points: 10
          },
          {
            criterion: 'Metodología',
            description: 'Aplica correctamente los métodos algebraicos',
            points: 15
          },
          {
            criterion: 'Cálculos',
            description: 'Realiza los cálculos de forma correcta',
            points: 15
          },
          {
            criterion: 'Presentación',
            description: 'Presenta el trabajo de forma clara y organizada',
            points: 10
          }
        ],
        submission: undefined // Se puede agregar una entrega si el ID corresponde a una tarea entregada
      };

      this.task.set(mockTask);
      if (mockTask.submission) {
        this.submissionText.set(mockTask.submission.text);
      }
      this.isLoading.set(false);
    }, 500);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.uploadedFiles.set([...this.uploadedFiles(), ...files]);
    }
  }

  removeFile(index: number) {
    const files = [...this.uploadedFiles()];
    files.splice(index, 1);
    this.uploadedFiles.set(files);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  openSubmitConfirmation() {
    if (!this.submissionText().trim() && this.uploadedFiles().length === 0) {
      alert('Por favor, completa al menos el texto de respuesta o sube un archivo.');
      return;
    }
    this.showSubmitConfirmation.set(true);
  }

  cancelSubmit() {
    this.showSubmitConfirmation.set(false);
  }

  submitTask() {
    this.isSubmitting.set(true);
    
    // Simulación de envío - en producción esto llamaría a un servicio
    setTimeout(() => {
      const updatedTask = { ...this.task()! };
      updatedTask.status = 'entregada';
      updatedTask.submission = {
        id: Date.now().toString(),
        submittedAt: new Date().toISOString(),
        text: this.submissionText(),
        files: this.uploadedFiles().map((file, index) => ({
          id: (index + 1).toString(),
          name: file.name,
          size: this.formatFileSize(file.size),
          type: file.type || 'Archivo',
          url: '#'
        })),
        status: 'submitted'
      };
      
      this.task.set(updatedTask);
      this.isSubmitting.set(false);
      this.showSubmitConfirmation.set(false);
      alert('¡Tarea entregada exitosamente!');
    }, 1000);
  }

  downloadMaterial(material: Material) {
    // Simulación de descarga
    console.log('Descargando:', material.name);
    // En producción, esto descargaría el archivo real
  }

  canEdit(): boolean {
    const task = this.task();
    if (!task) return false;
    
    if (task.status === 'entregada' || task.status === 'en-revision') {
      return false;
    }
    
    // Verificar si la fecha límite ya pasó
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    return now <= dueDate;
  }

  goBack() {
    this.router.navigate(['/tareas']);
  }
}
