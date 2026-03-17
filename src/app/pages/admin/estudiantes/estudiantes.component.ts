import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, StudentItem } from '../../../services/admin.service';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './estudiantes.component.html',
  styleUrl: './estudiantes.component.css'
})
export class EstudiantesComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedGrade = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  students = signal<StudentItem[]>([]);

  // Getter/setter pairs so [(ngModel)] works with signals
  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterSection = signal('todos');
  get filterSection(): string { return this._filterSection(); }
  set filterSection(v: string) { this._filterSection.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  // Grade cards: unique grades from enrollment data
  availableGrades = computed(() => {
    const grades = new Set(
      this.students()
        .map(s => s.grade ?? '')
        .filter(g => !!g)
    );
    return Array.from(grades).sort();
  });

  filteredStudents = computed(() => {
    let result = this.students().filter(s => !!s.grade); // only enrolled students
    const grade = this.selectedGrade();
    const section = this._filterSection();
    const status = this._filterStatus();
    const q = this._searchQuery().toLowerCase();

    if (grade) result = result.filter(s => s.grade === grade);
    if (section !== 'todos') result = result.filter(s => s.section === section);
    if (status && status !== 'todos') result = result.filter(s => s.status === status);
    if (q) {
      result = result.filter(s =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.code ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getStudents({
      page: this.currentPage(),
      pageSize: 200
    }).subscribe({
      next: ({ data, meta }) => {
        this.students.set(data);
        this.totalPages.set(meta.totalPages);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar estudiantes'); this.loading.set(false); }
    });
  }

  selectGrade(grade: string) { this.selectedGrade.set(grade); }

  getStudentsCountByGrade(grade: string): number {
    return this.students().filter(s => s.grade === grade).length;
  }

  importStudents() {
    alert('Importación masiva no disponible en esta versión');
  }
}
