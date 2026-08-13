import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService, CourseItem, ScheduleSlot, AssignmentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import { resolveCourseCoverUrl, courseCoverAlt } from '../../../shared/utils/course-cover';

type CourseBlock = { course: CourseItem; block: ScheduleSlot };
type ViewMode = 'catalog' | 'timetable';

interface GradeGroup {
  grade: string;
  level: string;
  courses: CourseItem[];
}

@Component({
  selector: 'app-cursos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
  templateUrl: './cursos-admin.component.html',
  styleUrl: './cursos-admin.component.css'
})
export class CursosAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  viewMode = signal<ViewMode>('catalog');

  courses = signal<CourseItem[]>([]);
  teacherByCourseId = signal<Record<string, string>>({});

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterLevel = signal('');
  get filterLevel(): string { return this._filterLevel(); }
  set filterLevel(v: string) { this._filterLevel.set(v); }

  private _filterGrade = signal('');
  get filterGrade(): string { return this._filterGrade(); }
  set filterGrade(v: string) { this._filterGrade.set(v); }

  selectedGrade = signal('');

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly calendarStartHour = 7;
  readonly calendarEndHour = 18;

  private readonly gradeOrder = [
    '3 años', '4 años', '5 años',
    '1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria',
    '1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria',
  ];

  readonly hourSlots = computed(() => {
    const slots: string[] = [];
    for (let h = this.calendarStartHour; h <= this.calendarEndHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  });

  availableGrades = computed(() => {
    const grades = new Set(this.courses().map(c => c.grade).filter(Boolean) as string[]);
    return Array.from(grades).sort((a, b) => this.compareGrades(a, b));
  });

  availableLevels = computed(() =>
    Array.from(new Set(this.courses().map(c => (c.level ?? '').toLowerCase()).filter(Boolean))).sort()
  );

  filteredCourses = computed(() => {
    const q = this._searchQuery().toLowerCase().trim();
    const level = this._filterLevel();
    const grade = this._filterGrade();
    const map = this.teacherByCourseId();
    return this.courses().filter(c => {
      if (grade && c.grade !== grade) return false;
      if (level && (c.level ?? '').toLowerCase() !== level) return false;
      if (!q) return true;
      const teacher = (map[c.id] ?? '').toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        teacher.includes(q) ||
        (c.classroom ?? '').toLowerCase().includes(q)
      );
    });
  });

  groupedCourses = computed((): GradeGroup[] => {
    const groups = new Map<string, CourseItem[]>();
    for (const c of this.filteredCourses()) {
      const key = (c.grade ?? '').trim() || 'Sin grado';
      const list = groups.get(key) ?? [];
      list.push(c);
      groups.set(key, list);
    }
    const keys = Array.from(groups.keys()).sort((a, b) => this.compareGrades(a, b));
    return keys.map(grade => {
      const courses = (groups.get(grade) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
      return {
        grade,
        level: courses.find(c => !!c.level)?.level ?? '',
        courses,
      };
    });
  });

  coursesOfSelectedGrade = computed(() => {
    const grade = this.selectedGrade();
    if (!grade) return [];
    return this.filteredCourses().filter(c => c.grade === grade);
  });

  withTeacherCount = computed(() => {
    const map = this.teacherByCourseId();
    return this.courses().filter(c => !!map[c.id]).length;
  });

  withoutScheduleCount = computed(() =>
    this.courses().filter(c => !c.schedule?.length).length
  );

  hasActiveFilters = computed(() =>
    !!this._searchQuery() || !!this._filterGrade() || !!this._filterLevel()
  );

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    forkJoin({
      coursesResp: this.adminService.getCourses({ pageSize: 100 }),
      assignsResp: this.adminService.getTeacherAssignments({ pageSize: 100 }),
    }).subscribe({
      next: ({ coursesResp, assignsResp }) => {
        this.courses.set(coursesResp.data);
        const m: Record<string, string> = {};
        for (const a of assignsResp.data as AssignmentItem[]) {
          if (a.isActive === false || !a.course?.id) continue;
          const fn = a.teacher?.user?.firstName ?? '';
          const ln = a.teacher?.user?.lastName ?? '';
          const label = `${fn} ${ln}`.trim();
          if (!label) continue;
          m[a.course.id] = label;
        }
        this.teacherByCourseId.set(m);
        if (!this.selectedGrade() && coursesResp.data.length) {
          const grades = Array.from(new Set(coursesResp.data.map(c => c.grade).filter(Boolean) as string[]))
            .sort((a, b) => this.compareGrades(a, b));
          if (grades[0]) this.selectedGrade.set(grades[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar cursos');
        this.loading.set(false);
      },
    });
  }

  setView(mode: ViewMode) {
    this.viewMode.set(mode);
    if (mode === 'timetable' && !this.selectedGrade() && this.availableGrades()[0]) {
      this.selectedGrade.set(this.availableGrades()[0]);
    }
  }

  openTimetable(grade: string) {
    this.selectedGrade.set(grade);
    this.viewMode.set('timetable');
  }

  selectGrade(grade: string) { this.selectedGrade.set(grade); }

  resetFilters() {
    this._searchQuery.set('');
    this._filterGrade.set('');
    this._filterLevel.set('');
  }

  teacherName(courseId: string): string {
    return this.teacherByCourseId()[courseId] ?? '';
  }

  coverUrl(course: CourseItem): string {
    return resolveCourseCoverUrl({ name: course.name });
  }

  coverAlt(course: CourseItem): string {
    return courseCoverAlt(course.name);
  }

  courseAccent(course: CourseItem): string {
    return course.color || '#003366';
  }

  dayHasClass(course: CourseItem, day: string): boolean {
    return (course.schedule ?? []).some(s => s.day === day);
  }

  scheduleHint(course: CourseItem): string {
    if (!course.schedule?.length) return 'Sin horario';
    return course.schedule
      .map(s => `${s.day.substring(0, 3)} ${s.startTime}–${s.endTime}`)
      .join(' · ');
  }

  hoursLabel(course: CourseItem): string {
    if (!course.hours) return '';
    return `${course.hours} h`;
  }

  deleteCourse(id: string) {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    this.adminService.deleteCourse(id).subscribe({
      next: () => this.load()
    });
  }

  getBlockTop(startTime: string): number {
    return Math.max(0, this.timeToMinutes(startTime) - this.calendarStartHour * 60);
  }

  getBlockHeight(startTime: string, endTime: string): number {
    return Math.max(28, this.timeToMinutes(endTime) - this.timeToMinutes(startTime));
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

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private compareGrades(a: string, b: string): number {
    if (a === 'Sin grado') return 1;
    if (b === 'Sin grado') return -1;
    const ia = this.gradeOrder.indexOf(a);
    const ib = this.gradeOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'es');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
}
