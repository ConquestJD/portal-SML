import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

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

  title = signal('');
  description = signal('');
  instructions = signal('');
  dueDate = signal('');
  deliveryType = signal<'archivo' | 'texto' | 'link'>('archivo');
  allowLateDelivery = signal(false);
  rubric = signal('');
  attachments = signal<string[]>([]);

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      if (params['taskId'] && params['taskId'] !== 'nueva') {
        this.taskId.set(params['taskId']);
        this.isEditMode.set(true);
        // Cargar datos de la tarea existente
      }
    });
  }

  saveTask() {
    const taskData = {
      title: this.title(),
      description: this.description(),
      instructions: this.instructions(),
      dueDate: this.dueDate(),
      deliveryType: this.deliveryType(),
      allowLateDelivery: this.allowLateDelivery(),
      rubric: this.rubric(),
      attachments: this.attachments()
    };
    // Lógica para guardar tarea
    console.log('Guardando tarea:', taskData);
  }

  addAttachment() {
    // Lógica para agregar archivo
  }
}
