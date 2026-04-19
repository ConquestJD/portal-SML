import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, CourseItem, ScheduleSlot } from '../../../services/admin.service';

type CourseBlock = { course: CourseItem; block: ScheduleSlot };

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

  courses = signal<CourseItem[]>([]);
  selectedGrade = signal('');

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly calendarStartHour = 7;
  readonly calendarEndHour = 18;

  readonly hourSlots = computed(() => {
    const slots: string[] = [];
    for (let h = this.calendarStartHour; h <= this.calendarEndHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  });

  availableGrades = computed(() => {
    const grades = new Set(this.courses().map(c => c.grade).filter(Boolean) as string[]);
    return Array.from(grades).sort();
  });

  coursesOfSelectedGrade = computed(() => {
    const grade = this.selectedGrade();
    if (!grade) return [];
    const q = this.searchQuery().toLowerCase();
    return this.courses()
      .filter(c => c.grade === grade)
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getCourses({ pageSize: 100 }).subscribe({
      next: ({ data }) => {
        this.courses.set(data);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  selectGrade(grade: string) { this.selectedGrade.set(grade); }

  getCoursesCountByGrade(grade: string): number {
    return this.courses().filter(c => c.grade === grade).length;
  }

  deleteCourse(id: string) {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    this.adminService.deleteCourse(id).subscribe({
      next: () => this.load()
    });
  }

  // ─── CALENDAR POSITIONING ────────────────────────────────────────────────
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private calendarStartMinutes(): number { return this.calendarStartHour * 60; }

  getBlockTop(startTime: string): number {
    return Math.max(0, this.timeToMinutes(startTime) - this.calendarStartMinutes());
  }

  getBlockHeight(startTime: string, endTime: string): number {
    return Math.max(20, this.timeToMinutes(endTime) - this.timeToMinutes(startTime));
  }

  getBlocksForDay(day: string): CourseBlock[] {
    const result: CourseBlock[] = [];
    for (const course of this.coursesOfSelectedGrade()) {
      for (const block of course.schedule ?? []) {
        if (block.day === day) result.push({ course, block });
      }
    }
    return result.sort((a, b) => a.block.startTime.localeCompare(b.block.startTime));
  }

  readableSchedule(course: CourseItem): string {
    if (!course.schedule?.length) return 'Sin horario';
    return course.schedule
      .map(s => `${s.day.substring(0, 3)} ${s.startTime}-${s.endTime}`)
      .join(' · ');
  }
}
