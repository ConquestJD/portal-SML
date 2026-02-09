import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

type TaskStatus = 'pendiente' | 'entregada' | 'vencida';

interface Child {
  id: string;
  name: string;
  grade: string;
  section: string;
  photo?: string;
}

interface Task {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: TaskStatus;
  submitted: boolean;
  submittedDate?: string;
  childId: string;
  grade?: number;
}

@Component({
  selector: 'app-tareas-padre',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './tareas-padre.component.html',
  styleUrl: './tareas-padre.component.css'
})
export class TareasPadreComponent implements OnInit {
  selectedChildId = signal('1');
  filterStatus = signal<'todos' | TaskStatus>('todos');
  searchQuery = signal('');
  isLoading = signal(true);
  
  children = signal<Child[]>([
    { 
      id: '1', 
      name: 'María Rodríguez', 
      grade: '3ro', 
      section: 'A',
      photo: 'https://via.placeholder.com/60'
    },
    { 
      id: '2', 
      name: 'Pedro Rodríguez', 
      grade: '1ro', 
      section: 'B',
      photo: 'https://via.placeholder.com/60'
    }
  ]);

  allTasks = signal<Task[]>([]);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer query params si existe childId
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      }
    });

    this.loadTasks();
  }

  loadTasks() {
    this.isLoading.set(true);
    
    // Simular carga de tareas
    setTimeout(() => {
      // Tareas para María (3ro A)
      const mariaTasks: Task[] = [
        { id: '1', title: 'Tarea: Ejercicios de Álgebra', course: 'Matemática', dueDate: '2024-03-15', status: 'pendiente', submitted: false, childId: '1' },
        { id: '2', title: 'Proyecto: Resolución de Problemas', course: 'Matemática', dueDate: '2024-03-10', status: 'entregada', submitted: true, submittedDate: '2024-03-09', childId: '1', grade: 18 },
        { id: '3', title: 'Ensayo: Literatura Contemporánea', course: 'Lengua y Literatura', dueDate: '2024-03-08', status: 'vencida', submitted: false, childId: '1' },
        { id: '4', title: 'Tarea: Problemas de Geometría', course: 'Matemática', dueDate: '2024-03-25', status: 'pendiente', submitted: false, childId: '1' },
        { id: '5', title: 'Análisis de Texto', course: 'Lengua y Literatura', dueDate: '2024-03-12', status: 'entregada', submitted: true, submittedDate: '2024-03-11', childId: '1', grade: 17 }
      ];

      // Tareas para Pedro (1ro B)
      const pedroTasks: Task[] = [
        { id: '6', title: 'Tarea: Sumas y Restas', course: 'Matemática', dueDate: '2024-03-20', status: 'pendiente', submitted: false, childId: '2' },
        { id: '7', title: 'Lectura Comprensiva', course: 'Lengua y Literatura', dueDate: '2024-03-15', status: 'entregada', submitted: true, submittedDate: '2024-03-14', childId: '2', grade: 19 },
        { id: '8', title: 'Experimento de Ciencias', course: 'Ciencias', dueDate: '2024-03-18', status: 'pendiente', submitted: false, childId: '2' }
      ];

      this.allTasks.set([...mariaTasks, ...pedroTasks]);
      this.isLoading.set(false);
    }, 500);
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
  }

  selectedChild = computed(() => {
    return this.children().find(c => c.id === this.selectedChildId());
  });

  tasks = computed(() => {
    return this.allTasks().filter(t => t.childId === this.selectedChildId());
  });

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

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
