import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type TaskStatus = 'pendiente' | 'entregada' | 'vencida';

@Component({
  selector: 'app-tareas-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tareas-padre.component.html',
  styleUrl: './tareas-padre.component.css'
})
export class TareasPadreComponent {
  selectedChild = signal('1');
  filterStatus = signal<'todos' | TaskStatus>('todos');
  searchQuery = signal('');
  
  children = signal([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A' }
  ]);

  tasks = signal([
    { id: '1', title: 'Tarea: Ejercicios de Álgebra', course: 'Matemática', dueDate: '2024-03-15', status: 'pendiente' as TaskStatus, submitted: false },
    { id: '2', title: 'Proyecto: Resolución de Problemas', course: 'Matemática', dueDate: '2024-03-10', status: 'entregada' as TaskStatus, submitted: true, submittedDate: '2024-03-09' },
    { id: '3', title: 'Ensayo: Literatura Contemporánea', course: 'Lengua y Literatura', dueDate: '2024-03-08', status: 'vencida' as TaskStatus, submitted: false }
  ]);

  filteredTasks = computed(() => {
    let result = this.tasks();
    const status = this.filterStatus();
    const query = this.searchQuery().toLowerCase();

    if (status !== 'todos') {
      result = result.filter(t => t.status === status);
    }

    if (query) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.course.toLowerCase().includes(query)
      );
    }

    return result;
  });

  pendingCount = computed(() => this.tasks().filter(t => t.status === 'pendiente').length);
  completedCount = computed(() => this.tasks().filter(t => t.status === 'entregada').length);
  overdueCount = computed(() => this.tasks().filter(t => t.status === 'vencida').length);
}
