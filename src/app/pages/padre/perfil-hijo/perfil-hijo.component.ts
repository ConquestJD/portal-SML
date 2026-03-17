import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

@Component({
  selector: 'app-perfil-hijo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './perfil-hijo.component.html',
  styleUrl: './perfil-hijo.component.css'
})
export class PerfilHijoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  childDetail = signal<Child | null>(null);
  readonly isLoading = this.loading;

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) {
          this.selectedChildId.set(data[0].id);
          this.loadChild(data[0].id);
        }
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar hijos'); this.loading.set(false); }
    });
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
    this.loadChild(childId);
  }

  loadChild(childId: string) {
    this.parentService.getChild(childId).subscribe({
      next: (data) => this.childDetail.set(data)
    });
  }

  getChildName(child: Child): string { return `${child.user.firstName} ${child.user.lastName}`; }
  getGrade(): string { return this.childDetail()?.enrollments?.[0]?.section?.grade ?? ''; }
  getSection(): string { return this.childDetail()?.enrollments?.[0]?.section?.name ?? ''; }
}
