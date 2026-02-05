import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Task {
  id: string;
  name: string;
  course: string;
  courseCode: string;
  dueDate: string;
  status: 'pendiente' | 'entregada' | 'vencida' | 'en-revision';
  points: number;
  grade?: number;
}

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css'
})
export class TareasComponent {
  filter = signal<'todas' | 'pendientes' | 'entregadas' | 'vencidas'>('todas');
  searchQuery = signal('');

  tasks = signal<Task[]>([
    {
      id: '1',
      name: 'Proyecto de Matemática - Álgebra',
      course: 'Matemática',
      courseCode: 'MAT-2024',
      dueDate: '2024-03-25',
      status: 'pendiente',
      points: 50
    },
    {
      id: '2',
      name: 'Ensayo sobre Literatura',
      course: 'Lengua y Literatura',
      courseCode: 'LEN-2024',
      dueDate: '2024-03-20',
      status: 'vencida',
      points: 30
    },
    {
      id: '3',
      name: 'Laboratorio de Ciencias',
      course: 'Ciencias',
      courseCode: 'CIE-2024',
      dueDate: '2024-03-15',
      status: 'entregada',
      points: 40,
      grade: 18
    }
  ]);

  filteredTasks = signal<Task[]>(this.tasks());

  pendingCount = computed(() => 
    this.tasks().filter(t => t.status === 'pendiente').length
  );

  overdueCount = computed(() => 
    this.tasks().filter(t => t.status === 'vencida').length
  );

  completedCount = computed(() => 
    this.tasks().filter(t => t.status === 'entregada').length
  );

  setFilter(filter: 'todas' | 'pendientes' | 'entregadas' | 'vencidas') {
    this.filter.set(filter);
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let result = this.tasks();

    if (this.filter() !== 'todas') {
      const statusMap: Record<'pendientes' | 'entregadas' | 'vencidas', 'pendiente' | 'entregada' | 'vencida'> = {
        'pendientes': 'pendiente',
        'entregadas': 'entregada',
        'vencidas': 'vencida'
      };
      const status = statusMap[this.filter() as 'pendientes' | 'entregadas' | 'vencidas'];
      result = result.filter(task => task.status === status);
    }

    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(task =>
        task.name.toLowerCase().includes(query) ||
        task.course.toLowerCase().includes(query)
      );
    }

    this.filteredTasks.set(result);
  }
}
