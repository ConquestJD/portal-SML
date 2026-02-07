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

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  points: number;
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
  points = signal(20);
  deliveryType = signal<'archivo' | 'texto' | 'ambos' | 'clase'>('archivo');
  
  // Opciones avanzadas (colapsables)
  showAdvanced = signal(false);
  allowLateDelivery = signal(false);
  
  // Rúbrica mejorada
  rubricCriteria = signal<RubricCriterion[]>([]);
  showRubricBuilder = signal(false);
  
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

  totalRubricPoints = computed(() => {
    return this.rubricCriteria().reduce((sum, criterion) => sum + criterion.points, 0);
  });

  remainingRubricPoints = computed(() => {
    return Math.max(0, 20 - this.totalRubricPoints());
  });

  canAddCriterion = computed(() => this.totalRubricPoints() < 20);


  canSave = computed(() => {
    const hasRequiredFields = this.title().trim().length > 0 && 
                              this.instructions().trim().length > 0 && 
                              this.dueDate().length > 0;
    const rubricValid = this.rubricCriteria().length === 0 || 
                       (this.totalRubricPoints() > 0 && this.totalRubricPoints() <= 20);
    return hasRequiredFields && rubricValid;
  });

  addRubricCriterion() {
    if (!this.canAddCriterion()) {
      return;
    }
    const newCriterion: RubricCriterion = {
      id: Date.now().toString() + Math.random(),
      name: '',
      description: '',
      points: 0
    };
    this.rubricCriteria.update(criteria => [...criteria, newCriterion]);
    this.showRubricBuilder.set(true);
    // Actualizar puntos después de agregar un criterio
    this.updatePointsFromRubric();
  }


  getMaxPointsForCriterion(criterionId: string): number {
    const otherPoints = this.rubricCriteria()
      .filter(c => c.id !== criterionId)
      .reduce((sum, c) => sum + c.points, 0);
    return 20 - otherPoints;
  }

  updateCriterion(id: string, field: 'name' | 'description' | 'points', value: string | number) {
    if (field === 'points') {
      const numValue = +value;
      
      // Obtener puntos actuales de OTROS criterios (excluyendo el actual)
      const otherPoints = this.rubricCriteria()
        .filter(c => c.id !== id)
        .reduce((sum, c) => sum + c.points, 0);
      
      // Calcular máximo permitido para este criterio
      // La suma total de TODOS los criterios no puede exceder 20
      const maxAllowed = 20 - otherPoints;
      
      const validValue = Math.max(0, Math.min(isNaN(numValue) ? 0 : numValue, maxAllowed));

      // Actualizar el criterio con el valor válido (clamp al máximo permitido)
      this.rubricCriteria.update(criteria =>
        criteria.map(c => c.id === id ? { ...c, [field]: validValue } : c)
      );
      
      // Actualizar automáticamente los puntos de la tarea con la suma TOTAL de la rúbrica
      // Esto se ejecuta cada vez que cambian los puntos de cualquier criterio
      this.updatePointsFromRubric();
    } else {
      this.rubricCriteria.update(criteria =>
        criteria.map(c => c.id === id ? { ...c, [field]: value } : c)
      );
    }
  }

  onPointsInput(event: Event, criterionId: string) {
    const input = event.target as HTMLInputElement;
    const rawValue = +input.value;
    const otherPoints = this.rubricCriteria()
      .filter(c => c.id !== criterionId)
      .reduce((sum, c) => sum + c.points, 0);
    const maxAllowed = 20 - otherPoints;
    const clampedValue = Math.max(0, Math.min(isNaN(rawValue) ? 0 : rawValue, maxAllowed));

    if (input.value !== clampedValue.toString()) {
      input.value = clampedValue.toString();
    }

    this.rubricCriteria.update(criteria =>
      criteria.map(c => c.id === criterionId ? { ...c, points: clampedValue } : c)
    );
    this.updatePointsFromRubric();
  }

  removeRubricCriterion(id: string) {
    this.rubricCriteria.update(criteria => 
      criteria.filter(c => c.id !== id)
    );
    // Actualizar puntos después de eliminar un criterio
    this.updatePointsFromRubric();
  }

  private updatePointsFromRubric() {
    // La nota máxima siempre es 20
    this.points.set(20);
  }

  getRubricText(): string {
    if (this.rubricCriteria().length === 0) return '';
    
    return this.rubricCriteria()
      .map(c => `• ${c.name}: ${c.points} puntos\n  ${c.description || 'Sin descripción'}`)
      .join('\n\n');
  }

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
      rubric: this.rubricCriteria().length > 0 ? {
        criteria: this.rubricCriteria(),
        totalPoints: this.totalRubricPoints()
      } : undefined,
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
