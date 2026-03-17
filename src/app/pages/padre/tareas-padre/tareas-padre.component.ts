import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

@Component({
  selector: 'app-tareas-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tareas-padre.component.html',
  styleUrl: './tareas-padre.component.css'
})
export class TareasPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  filterStatus = signal('');
  searchQuery = signal('');
  children = signal<Child[]>([]);
  tasks = signal<unknown[]>([]);
  readonly isLoading = this.loading;
  readonly selectedChild = this.selectedChildId;

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.loadTasks(data[0].id); }
        this.loading.set(false);
      }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.loadTasks(id); }

  loadTasks(childId: string) {
    this.parentService.getChildTasks(childId, {
      status: this.filterStatus() || undefined,
      search: this.searchQuery() || undefined
    }).subscribe({ next: (data) => this.tasks.set(data) });
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }

  pendingCount = computed(() => (this.tasks() as any[]).filter((t: any) => t.status === 'PENDING').length);
  overdueCount = computed(() => (this.tasks() as any[]).filter((t: any) => t.status === 'OVERDUE').length);
  completedCount = computed(() => (this.tasks() as any[]).filter((t: any) => t.status === 'SUBMITTED' || t.status === 'GRADED').length);
}
