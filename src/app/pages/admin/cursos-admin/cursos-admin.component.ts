import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, CourseItem } from '../../../services/admin.service';

@Component({
  selector: 'app-cursos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-admin.component.html',
  styleUrl: './cursos-admin.component.css'
})
export class CursosAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  filterGrade = signal('');
  filterLevel = signal('');
  filterStatus = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  courses = signal<CourseItem[]>([]);
  selectedGrade = signal('');
  weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

  availableGrades = computed(() => {
    const grades = new Set(this.courses().map(c => c.grade).filter(Boolean));
    return Array.from(grades).sort();
  });

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.courses();
    return this.courses().filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getCourses({
      grade: this.filterGrade() || undefined,
      level: this.filterLevel() || undefined,
      status: this.filterStatus() || undefined,
      page: this.currentPage(),
      pageSize: 20
    }).subscribe({
      next: ({ data, meta }) => {
        this.courses.set(data);
        this.totalPages.set(meta.totalPages);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  selectGrade(grade: string) { this.selectedGrade.set(grade); }
  getCoursesCountByGrade(grade: string): number { return this.courses().filter(c => c.grade === grade).length; }
  formatTime(time: string): string { return time; }
  getCourseForTimeSlot(_day: string, _time: string): CourseItem | null { return null; }
  isCourseStart(_day: string, _time: string): boolean { return false; }
  getCourseSpan(_course: CourseItem): number { return 1; }

  deleteCourse(id: string) {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    this.adminService.deleteCourse(id).subscribe({
      next: () => this.load()
    });
  }
}
