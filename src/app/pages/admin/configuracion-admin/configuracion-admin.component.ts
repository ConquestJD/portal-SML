import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AdminService,
  AcademicYearItem,
  CourseItem,
  SectionItem,
  CreateAcademicYearDto,
  CreateSectionDto,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

type TabId = 'colegio' | 'cursos' | 'anio' | 'grados' | 'pensiones';

interface SchoolIdentity {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const IDENTITY_KEY = 'sml.school-identity';
const DEFAULT_IDENTITY: SchoolIdentity = {
  name: 'Colegio Santa María Laura',
  address: 'Av. Principal 123',
  phone: '+51 987 654 321',
  email: 'contacto@santamarialaura.edu.pe',
};

@Component({
  selector: 'app-configuracion-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, ...ADMIN_SHARED],
  templateUrl: './configuracion-admin.component.html',
  styleUrl: './configuracion-admin.component.css'
})
export class ConfiguracionAdminComponent implements OnInit {
  activeTab = signal<TabId>('colegio');
  saved = signal('');
  error = signal('');
  loading = signal(true);

  readonly tabs: AdminTab[] = [
    { id: 'colegio', label: 'Colegio' },
    { id: 'cursos', label: 'Cursos' },
    { id: 'anio', label: 'Año lectivo' },
    { id: 'grados', label: 'Grados' },
    { id: 'pensiones', label: 'Pensiones' },
  ];

  schoolData = signal<SchoolIdentity>({ ...DEFAULT_IDENTITY });
  years = signal<AcademicYearItem[]>([]);
  courses = signal<CourseItem[]>([]);
  sections = signal<SectionItem[]>([]);

  private _courseGrade = signal('');
  get courseGrade(): string { return this._courseGrade(); }
  set courseGrade(v: string) { this._courseGrade.set(v); }

  yearFormOpen = signal(false);
  yearEditId = signal('');
  yearForm = signal<CreateAcademicYearDto>({ name: '', startDate: '', endDate: '', status: 'UPCOMING' });

  gradeFormOpen = signal(false);
  gradeEditId = signal('');
  gradeForm = signal<CreateSectionDto>({ name: 'A', grade: '', level: '', academicYearId: '', capacity: 30 });

  readonly levels = ['Inicial', 'Primaria', 'Secundaria'];
  readonly gradesByLevel: Record<string, string[]> = {
    Inicial: ['3 años', '4 años', '5 años'],
    Primaria: ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'],
    Secundaria: ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'],
  };

  monthlyTuitionAmount = signal(250);
  applyToPending = signal(false);
  tuitionSaving = signal(false);

  activeYear = computed(() =>
    this.years().find(y => this.yearStatusKey(y.status) === 'active') ?? this.years()[0] ?? null
  );

  courseGrades = computed(() =>
    Array.from(new Set(this.courses().map(c => c.grade).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'es'))
  );

  filteredCourses = computed(() => {
    const grade = this._courseGrade();
    return this.courses().filter(c => !grade || c.grade === grade);
  });

  gradesOfYear = computed(() => {
    const yearId = this.activeYear()?.id;
    const list = this.sections().filter(s => !yearId || s.academicYear?.id === yearId);
    const unique = new Map<string, SectionItem>();
    for (const s of list) {
      const key = `${s.grade}|${s.level}|${s.academicYear?.id}`;
      if (!unique.has(key)) unique.set(key, s);
    }
    return Array.from(unique.values()).sort((a, b) =>
      `${a.level} ${a.grade}`.localeCompare(`${b.level} ${b.grade}`, 'es')
    );
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.schoolData.set(this.readIdentity());
    this.reload();
  }

  setTab(tab: string) {
    this.activeTab.set(tab as TabId);
    this.saved.set('');
    this.error.set('');
  }

  reload() {
    this.loading.set(true);
    forkJoin({
      years: this.adminService.getAcademicYears(),
      courses: this.adminService.getCourses({ pageSize: 100 }),
      sections: this.adminService.getSections(),
      settings: this.adminService.getSettings(),
    }).subscribe({
      next: ({ years, courses, sections, settings }) => {
        this.years.set(years ?? []);
        this.courses.set(courses.data ?? []);
        this.sections.set((sections.data ?? []).map(s => this.normalizeSection(s)));
        this.monthlyTuitionAmount.set(settings?.monthlyTuitionAmount ?? 250);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.adminService.getAcademicYears().subscribe({ next: (y) => this.years.set(y ?? []) });
        this.adminService.getCourses({ pageSize: 100 }).subscribe({ next: (r) => this.courses.set(r.data ?? []) });
        this.adminService.getSections().subscribe({
          next: (r) => this.sections.set((r.data ?? []).map(s => this.normalizeSection(s))),
        });
      },
    });
  }

  patchSchool(field: keyof SchoolIdentity, value: string) {
    this.schoolData.update(d => ({ ...d, [field]: value }));
  }

  saveIdentity() {
    this.writeIdentity(this.schoolData());
    this.saved.set('Identidad del colegio guardada.');
  }

  courseStatusLabel(status: string): string {
    const key = (status || '').toUpperCase();
    if (key === 'ACTIVE') return 'Activo';
    if (key === 'INACTIVE') return 'Inactivo';
    if (key === 'ARCHIVED') return 'Archivado';
    return status || '—';
  }

  archiveCourse(course: CourseItem) {
    if (!confirm(`¿Archivar ${course.name}? Dejará de aparecer en el plan de estudios.`)) return;
    this.adminService.deleteCourse(course.id).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('No se pudo archivar el curso.'),
    });
  }

  yearStatusKey(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'ACTIVO') return 'active';
    if (s === 'UPCOMING' || s === 'PROXIMO' || s === 'PRÓXIMO') return 'upcoming';
    return 'closed';
  }

  yearStatusLabel(status: string): string {
    const key = this.yearStatusKey(status);
    if (key === 'active') return 'En curso';
    if (key === 'upcoming') return 'Próximo';
    return 'Cerrado';
  }

  openYearForm(year?: AcademicYearItem) {
    if (year) {
      this.yearEditId.set(year.id);
      this.yearForm.set({
        name: year.name,
        startDate: this.toDateInput(year.startDate),
        endDate: this.toDateInput(year.endDate),
        status: (year.status || 'UPCOMING').toUpperCase(),
      });
    } else {
      this.yearEditId.set('');
      this.yearForm.set({ name: '', startDate: '', endDate: '', status: 'UPCOMING' });
    }
    this.yearFormOpen.set(true);
  }

  cancelYearForm() {
    this.yearFormOpen.set(false);
    this.yearEditId.set('');
  }

  patchYear(field: keyof CreateAcademicYearDto, value: string) {
    this.yearForm.update(d => ({ ...d, [field]: value }));
  }

  saveYear() {
    const dto = this.yearForm();
    if (!dto.name || !dto.startDate || !dto.endDate) return;
    const req = this.yearEditId()
      ? this.adminService.updateAcademicYear(this.yearEditId(), dto)
      : this.adminService.createAcademicYear(dto);
    req.subscribe({
      next: () => {
        this.cancelYearForm();
        this.saved.set('Año lectivo guardado.');
        this.reload();
      },
      error: () => this.error.set('No se pudo guardar el año lectivo.'),
    });
  }

  gradesForLevel(): string[] {
    return this.gradesByLevel[this.gradeForm().level] ?? [];
  }

  openGradeForm(section?: SectionItem) {
    const yearId = this.activeYear()?.id ?? '';
    if (section) {
      this.gradeEditId.set(section.id);
      this.gradeForm.set({
        name: section.name || 'A',
        grade: section.grade,
        level: section.level,
        academicYearId: section.academicYear?.id ?? yearId,
        capacity: section.capacity || 30,
      });
    } else {
      this.gradeEditId.set('');
      this.gradeForm.set({ name: 'A', grade: '', level: '', academicYearId: yearId, capacity: 30 });
    }
    this.gradeFormOpen.set(true);
  }

  cancelGradeForm() {
    this.gradeFormOpen.set(false);
    this.gradeEditId.set('');
  }

  patchGrade(field: keyof CreateSectionDto, value: string | number) {
    this.gradeForm.update(d => ({ ...d, [field]: value }));
  }

  saveGrade() {
    const dto = { ...this.gradeForm(), name: this.gradeForm().name || 'A' };
    if (!dto.grade || !dto.level || !dto.academicYearId) return;
    if (!this.gradeEditId()) {
      const exists = this.sections().some(
        s => s.grade === dto.grade && s.academicYear?.id === dto.academicYearId
      );
      if (exists) {
        this.error.set('Ese grado ya está registrado en el año seleccionado.');
        return;
      }
    }
    const req = this.gradeEditId()
      ? this.adminService.updateSection(this.gradeEditId(), dto)
      : this.adminService.createSection(dto);
    req.subscribe({
      next: () => {
        this.cancelGradeForm();
        this.saved.set('Grado guardado.');
        this.reload();
      },
      error: () => this.error.set('No se pudo guardar el grado.'),
    });
  }

  enrolledOf(section: SectionItem): number {
    return section.enrolledCount ?? 0;
  }

  saveTuition() {
    const amount = Number(this.monthlyTuitionAmount());
    if (!Number.isFinite(amount) || amount < 1) {
      this.error.set('Indica un monto mensual de al menos S/ 1.');
      return;
    }
    this.tuitionSaving.set(true);
    this.error.set('');
    this.adminService.updateSettings({
      monthlyTuitionAmount: amount,
      applyToPending: this.applyToPending(),
    }).subscribe({
      next: (res) => {
        this.tuitionSaving.set(false);
        this.monthlyTuitionAmount.set(res.monthlyTuitionAmount);
        const extra = res.updatedPending
          ? ` Se actualizaron ${res.updatedPending} cuotas pendientes o en retraso.`
          : '';
        this.saved.set(`Pensión mensual: S/ ${res.monthlyTuitionAmount.toFixed(2)}.${extra}`);
      },
      error: () => {
        this.tuitionSaving.set(false);
        this.error.set('No se pudo guardar el monto de la pensión.');
      },
    });
  }

  private normalizeSection(s: SectionItem): SectionItem {
    const raw = s as SectionItem & { _count?: { enrollments?: number }; enrolled?: number };
    return {
      ...s,
      enrolledCount: s.enrolledCount ?? raw._count?.enrollments ?? raw.enrolled ?? 0,
    };
  }

  private toDateInput(value: string): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private readIdentity(): SchoolIdentity {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_IDENTITY };
    try {
      const raw = localStorage.getItem(IDENTITY_KEY);
      if (!raw) return { ...DEFAULT_IDENTITY };
      return { ...DEFAULT_IDENTITY, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_IDENTITY };
    }
  }

  private writeIdentity(data: SchoolIdentity) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(data));
  }
}
