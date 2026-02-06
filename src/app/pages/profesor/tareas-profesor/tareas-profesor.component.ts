import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Task {
  id: string;
  title: string;
  course: string;
  courseId: string;
  dueDate: string;
  submitted: number;
  pending: number;
  total: number;
  status: 'borrador' | 'publicada' | 'cerrada';
}

@Component({
  selector: 'app-tareas-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tareas-profesor.component.html',
  styleUrl: './tareas-profesor.component.css'
})
export class TareasProfesorComponent {
  filter = signal<'todas' | 'borrador' | 'publicada' | 'cerrada'>('todas');
  searchQuery = signal('');

  tasks = signal<Task[]>([
    {
      id: '1',
      title: 'Álgebra Lineal',
      course: 'Matemática - 3ro A',
      courseId: '1',
      dueDate: '2024-03-25',
      submitted: 25,
      pending: 5,
      total: 30,
      status: 'publicada'
    },
    {
      id: '2',
      title: 'Geometría',
      course: 'Matemática - 3ro B',
      courseId: '2',
      dueDate: '2024-03-28',
      submitted: 20,
      pending: 10,
      total: 30,
      status: 'publicada'
    },
    {
      id: '3',
      title: 'Cálculo Diferencial',
      course: 'Matemática - 4to A',
      courseId: '3',
      dueDate: '2024-04-01',
      submitted: 0,
      pending: 32,
      total: 32,
      status: 'borrador'
    }
  ]);

  filteredTasks = computed(() => {
    let result = this.tasks();
    const filter = this.filter();
    const query = this.searchQuery().toLowerCase();

    if (filter !== 'todas') {
      result = result.filter(task => task.status === filter);
    }

    if (query) {
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.course.toLowerCase().includes(query)
      );
    }

    return result;
  });

  pendingCount = computed(() => 
    this.tasks().reduce((sum, task) => sum + task.pending, 0)
  );

  totalTasks = computed(() => this.tasks().length);

  applyFilters() {
    // Los filtros se aplican automáticamente mediante computed
  }

  onSearch() {
    // La búsqueda se aplica automáticamente mediante computed
  }
}
