import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

@Component({
  selector: 'app-notas-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notas-padre.component.html',
  styleUrl: './notas-padre.component.css'
})
export class NotasPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  grades = signal<unknown[]>([]);
  readonly isLoading = this.loading;
  readonly selectedChild = this.selectedChildId;

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.loadGrades(data[0].id); }
        this.loading.set(false);
      }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.loadGrades(id); }

  loadGrades(childId: string) {
    this.parentService.getChildGrades(childId).subscribe({
      next: (data) => this.grades.set(data)
    });
  }

  exportGrades() {
    const childId = this.selectedChildId();
    if (childId) window.open(this.parentService.getChildGradesExportUrl(childId));
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }

  downloadBoleta() {
    const childId = this.selectedChildId();
    if (childId) window.open(this.parentService.getChildGradesExportUrl(childId));
  }
}
