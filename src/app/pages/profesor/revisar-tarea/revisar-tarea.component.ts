import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  submittedAt: string;
  status: 'pendiente' | 'entregada' | 'calificada' | 'vencida';
  text?: string;
  files?: AttachmentFile[];
  grade?: number;
  feedback?: string;
  rubricScores?: { criterionId: string; criterionName: string; points: number; maxPoints: number }[];
}

interface AttachmentFile {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  instructions: string;
  courseId: string;
  courseName: string;
  dueDate: string;
  points: number;
  deliveryType: 'archivo' | 'texto' | 'ambos' | 'en-clase';
  rubric?: RubricCriterion[];
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  points: number;
}

@Component({
  selector: 'app-revisar-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './revisar-tarea.component.html',
  styleUrl: './revisar-tarea.component.css'
})
export class RevisarTareaComponent implements OnInit {
  courseId = signal<string | null>(null);
  taskId = signal<string | null>(null);
  task = signal<TaskDetail | null>(null);
  submissions = signal<Submission[]>([]);
  isLoading = signal(true);
  
  filterStatus = signal<'todas' | 'pendiente' | 'entregada' | 'calificada' | 'vencida'>('todas');
  searchQuery = signal('');
  selectedSubmission = signal<Submission | null>(null);
  showGradingModal = signal(false);
  
  // Formulario de calificación
  gradingGrade = signal<number | null>(null);
  gradingFeedback = signal('');
  gradingRubricScores = signal<{ [criterionId: string]: number }>({});

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      this.taskId.set(params['taskId']);
      this.loadTask();
    });
  }

  loadTask() {
    this.isLoading.set(true);
    // Simulación de carga de datos
    setTimeout(() => {
      const mockTask: TaskDetail = {
        id: this.taskId()!,
        title: 'Proyecto de Matemática - Álgebra',
        description: 'Este proyecto tiene como objetivo aplicar los conceptos de álgebra aprendidos en clase.',
        instructions: 'Resuelve los problemas planteados y presenta tu trabajo de forma clara.',
        courseId: this.courseId()!,
        courseName: 'Matemática - 3ro A',
        dueDate: '2024-03-25T23:59:00',
        points: 20,
        deliveryType: 'ambos',
        rubric: [
          { id: '1', name: 'Comprensión del Problema', description: 'Demuestra comprensión clara del problema', points: 5 },
          { id: '2', name: 'Metodología', description: 'Aplica correctamente los métodos algebraicos', points: 7 },
          { id: '3', name: 'Cálculos', description: 'Realiza los cálculos de forma correcta', points: 5 },
          { id: '4', name: 'Presentación', description: 'Presenta el trabajo de forma clara y organizada', points: 3 }
        ]
      };

      const mockSubmissions: Submission[] = [
        {
          id: '1',
          studentId: '1',
          studentName: 'Juan Pérez',
          studentCode: '2024001',
          submittedAt: '2024-03-20T10:30:00',
          status: 'entregada',
          text: 'He completado todos los problemas según las instrucciones...',
          files: [
            { id: '1', name: 'solucion_problemas.pdf', size: '1.5 MB', type: 'PDF', url: '#' }
          ]
        },
        {
          id: '2',
          studentId: '2',
          studentName: 'María García',
          studentCode: '2024002',
          submittedAt: '2024-03-22T14:20:00',
          status: 'calificada',
          text: 'Presento mi trabajo completo...',
          files: [
            { id: '2', name: 'trabajo_algebra.pdf', size: '2.1 MB', type: 'PDF', url: '#' }
          ],
          grade: 18,
          feedback: 'Excelente trabajo. Has demostrado un buen entendimiento de los conceptos.',
          rubricScores: [
            { criterionId: '1', criterionName: 'Comprensión del Problema', points: 5, maxPoints: 5 },
            { criterionId: '2', criterionName: 'Metodología', points: 6, maxPoints: 7 },
            { criterionId: '3', criterionName: 'Cálculos', points: 5, maxPoints: 5 },
            { criterionId: '4', criterionName: 'Presentación', points: 2, maxPoints: 3 }
          ]
        },
        {
          id: '3',
          studentId: '3',
          studentName: 'Carlos López',
          studentCode: '2024003',
          submittedAt: '',
          status: 'pendiente',
        },
        {
          id: '4',
          studentId: '4',
          studentName: 'Ana Martínez',
          studentCode: '2024004',
          submittedAt: '2024-03-26T09:15:00',
          status: 'vencida',
          text: 'Entrega tardía...',
          files: [
            { id: '3', name: 'trabajo_tarde.pdf', size: '1.8 MB', type: 'PDF', url: '#' }
          ]
        }
      ];

      this.task.set(mockTask);
      this.submissions.set(mockSubmissions);
      this.isLoading.set(false);
    }, 500);
  }

  filteredSubmissions = computed(() => {
    let result = this.submissions();
    const filter = this.filterStatus();
    const query = this.searchQuery().toLowerCase();

    if (filter !== 'todas') {
      result = result.filter(sub => sub.status === filter);
    }

    if (query) {
      result = result.filter(sub =>
        sub.studentName.toLowerCase().includes(query) ||
        sub.studentCode.toLowerCase().includes(query)
      );
    }

    return result;
  });

  pendingCount = computed(() => 
    this.submissions().filter(s => s.status === 'entregada' || s.status === 'vencida').length
  );

  gradedCount = computed(() => 
    this.submissions().filter(s => s.status === 'calificada').length
  );

  openGradingModal(submission: Submission) {
    this.selectedSubmission.set(submission);
    this.gradingGrade.set(submission.grade || null);
    this.gradingFeedback.set(submission.feedback || '');
    
    // Inicializar puntajes de rúbrica
    const rubricScores: { [criterionId: string]: number } = {};
    if (submission.rubricScores) {
      submission.rubricScores.forEach(score => {
        rubricScores[score.criterionId] = score.points;
      });
    }
    this.gradingRubricScores.set(rubricScores);
    
    this.showGradingModal.set(true);
  }

  closeGradingModal() {
    this.showGradingModal.set(false);
    this.selectedSubmission.set(null);
    this.gradingGrade.set(null);
    this.gradingFeedback.set('');
    this.gradingRubricScores.set({});
  }

  updateRubricScore(criterionId: string, points: number) {
    const maxPoints = this.task()?.rubric?.find(r => r.id === criterionId)?.points || 0;
    const validPoints = Math.max(0, Math.min(points, maxPoints));
    this.gradingRubricScores.update(scores => ({
      ...scores,
      [criterionId]: validPoints
    }));
  }

  getRubricTotal(): number {
    return Object.values(this.gradingRubricScores()).reduce((sum, points) => sum + points, 0);
  }

  saveGrading() {
    const submission = this.selectedSubmission();
    if (!submission) return;

    const rubricScores = this.task()?.rubric?.map(criterion => ({
      criterionId: criterion.id,
      criterionName: criterion.name,
      points: this.gradingRubricScores()[criterion.id] || 0,
      maxPoints: criterion.points
    })) || [];

    // Actualizar la entrega
    this.submissions.update(subs =>
      subs.map(sub =>
        sub.id === submission.id
          ? {
              ...sub,
              status: 'calificada',
              grade: this.gradingGrade() || 0,
              feedback: this.gradingFeedback(),
              rubricScores: rubricScores
            }
          : sub
      )
    );

    this.closeGradingModal();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'calificada': return 'badge-success';
      case 'entregada': return 'badge-info';
      case 'vencida': return 'badge-warning';
      case 'pendiente': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'calificada': return 'Calificada';
      case 'entregada': return 'Entregada';
      case 'vencida': return 'Vencida';
      case 'pendiente': return 'Pendiente';
      default: return status;
    }
  }

  formatFileSize(size: string): string {
    return size;
  }

  goBack() {
    this.router.navigate(['/profesor/cursos', this.courseId()]);
  }
}
