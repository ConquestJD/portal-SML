import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

@Component({
  selector: 'app-cursos-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-padre.component.html',
  styleUrl: './cursos-padre.component.css'
})
export class CursosPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  searchQuery = signal('');
  children = signal<Child[]>([]);
  courses = signal<unknown[]>([]);
  readonly isLoading = this.loading;
  readonly selectedChild = this.selectedChildId;

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.loadCourses(data[0].id); }
        this.loading.set(false);
      },
      error: () => { this.error.set('Error'); this.loading.set(false); }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.loadCourses(id); }

  loadCourses(childId: string) {
    this.parentService.getChildCourses(childId).subscribe({
      next: (data) => this.courses.set(data)
    });
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }
}
