import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentTask } from '../../services/student.service';

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css'
})
export class TareasComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  filterStatus = signal('');
  searchQuery = signal('');
  filter = signal('all');
  tasks = signal<StudentTask[]>([]);

  filteredTasks = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const f = this.filter();
    let list = this.tasks();
    if (f && f !== 'all') list = list.filter(t => t.status === f.toUpperCase());
    if (!q) return list;
    return list.filter(t => t.title.toLowerCase().includes(q));
  });

  pendingCount = computed(() => this.tasks().filter(t => t.status === 'PENDING').length);
  overdueCount = computed(() => this.tasks().filter(t => t.status === 'OVERDUE').length);
  completedCount = computed(() => this.tasks().filter(t => t.status === 'SUBMITTED' || t.status === 'GRADED').length);

  constructor(private studentService: StudentService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.studentService.getTasks({
      status: this.filterStatus() || undefined,
      search: this.searchQuery() || undefined
    }).subscribe({
      next: (data) => { this.tasks.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar tareas'); this.loading.set(false); }
    });
  }

  onFilterChange() { this.load(); }
  onSearch() { this.load(); }
  setFilter(f: string) { this.filter.set(f); }
}
