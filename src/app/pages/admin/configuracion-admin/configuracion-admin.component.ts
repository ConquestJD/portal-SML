import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminService,
  AcademicYearItem,
  activeAcademicYear,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';
import { PredefinedSubject, SchoolLevel, subjectCoverUrl } from '../../../shared/data/predefined-subjects';
import { SubjectCatalogService } from '../../../shared/data/subject-catalog.service';
import {
  COURSE_COVER_LIBRARY,
  CourseCoverSubject,
  courseCoverSrc,
  resolveCourseSubject,
} from '../../../shared/utils/course-cover';

type TabId = 'colegio' | 'materias' | 'pensiones';

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
  imports: [CommonModule, FormsModule, ...ADMIN_SHARED],
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
    { id: 'materias', label: 'Materias' },
    { id: 'pensiones', label: 'Pensiones' },
  ];

  schoolData = signal<SchoolIdentity>({ ...DEFAULT_IDENTITY });
  years = signal<AcademicYearItem[]>([]);
  subjects = signal<PredefinedSubject[]>([]);
  subjectFilter = signal<'all' | SchoolLevel>('all');

  subjectFormOpen = signal(false);
  subjectEditId = signal('');
  coverPicked = signal(false);
  subjectForm = signal({
    name: '',
    codePrefix: '',
    color: '#003366',
    coverKey: 'general' as CourseCoverSubject,
    primaria: true,
    secundaria: true,
  });

  readonly coverLibrary = COURSE_COVER_LIBRARY;

  visibleSubjects = computed(() => {
    const filter = this.subjectFilter();
    const list = this.subjects();
    if (filter === 'all') return list;
    return list.filter((s) => s.levels.includes(filter));
  });

  monthlyTuitionAmount = signal(250);
  applyToPending = signal(false);
  tuitionSaving = signal(false);

  activeYear = computed(() => activeAcademicYear(this.years()));

  constructor(
    private adminService: AdminService,
    private subjectCatalog: SubjectCatalogService,
  ) {}

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
      settings: this.adminService.getSettings(),
    }).subscribe({
      next: ({ years, settings }) => {
        this.years.set(years ?? []);
        this.monthlyTuitionAmount.set(settings?.monthlyTuitionAmount ?? 250);
        this.subjects.set(this.subjectCatalog.hydrate(settings?.subjects));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.adminService.getAcademicYears().subscribe({ next: (y) => this.years.set(y ?? []) });
        this.subjectCatalog.load().subscribe({ next: (list) => this.subjects.set(list) });
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

  levelLabel(levels: SchoolLevel[]): string {
    const map: Record<SchoolLevel, string> = { primaria: 'Primaria', secundaria: 'Secundaria' };
    return levels.map(l => map[l]).filter(Boolean).join(' · ') || '—';
  }

  coverUrl(subject: PredefinedSubject): string {
    return subjectCoverUrl(subject);
  }

  formCoverSrc(): string {
    return courseCoverSrc(this.subjectForm().coverKey);
  }

  openSubjectForm(subject?: PredefinedSubject) {
    if (subject) {
      this.subjectEditId.set(subject.id);
      this.coverPicked.set(true);
      this.subjectForm.set({
        name: subject.name,
        codePrefix: subject.codePrefix,
        color: subject.color,
        coverKey: subject.coverKey,
        primaria: subject.levels.includes('primaria'),
        secundaria: subject.levels.includes('secundaria'),
      });
    } else {
      this.subjectEditId.set('');
      this.coverPicked.set(false);
      this.subjectForm.set({
        name: '',
        codePrefix: '',
        color: '#003366',
        coverKey: 'general',
        primaria: true,
        secundaria: true,
      });
    }
    this.subjectFormOpen.set(true);
  }

  cancelSubjectForm() {
    this.subjectFormOpen.set(false);
    this.subjectEditId.set('');
    this.coverPicked.set(false);
  }

  patchSubject(field: 'name' | 'codePrefix' | 'color', value: string) {
    this.subjectForm.update(d => {
      const next = { ...d, [field]: value };
      if (field === 'name' && !this.subjectEditId()) {
        next.codePrefix = this.subjectCatalog.prefixFromName(value);
        if (!this.coverPicked()) next.coverKey = resolveCourseSubject(value);
      }
      return next;
    });
  }

  selectCover(key: CourseCoverSubject) {
    this.coverPicked.set(true);
    this.subjectForm.update(d => ({ ...d, coverKey: key }));
  }

  toggleSubjectLevel(level: SchoolLevel, on: boolean) {
    this.subjectForm.update(d => ({ ...d, [level]: on }));
  }

  saveSubject() {
    const f = this.subjectForm();
    const name = f.name.trim();
    if (!name) {
      this.error.set('Indica el nombre de la materia.');
      return;
    }
    const levels: SchoolLevel[] = [];
    if (f.primaria) levels.push('primaria');
    if (f.secundaria) levels.push('secundaria');
    if (!levels.length) {
      this.error.set('Elige al menos un nivel.');
      return;
    }
    const current = [...this.subjects()];
    const draft = this.subjectCatalog.normalize({
      id: this.subjectEditId() || this.subjectCatalog.slug(name),
      name,
      codePrefix: f.codePrefix,
      color: f.color,
      coverKey: f.coverKey,
      levels,
    });
    const duplicate = current.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== draft.id);
    if (duplicate) {
      this.error.set('Ya existe una materia con ese nombre.');
      return;
    }
    const next = this.subjectEditId()
      ? current.map(s => s.id === draft.id ? draft : s)
      : [...current, draft];
    this.subjectCatalog.save(next).subscribe({
      next: (list) => {
        this.subjects.set(list);
        this.cancelSubjectForm();
        this.saved.set('Materia guardada. Ya aparece al crear un curso.');
      },
      error: () => this.error.set('No se pudo guardar la materia.'),
    });
  }

  removeSubject(subject: PredefinedSubject) {
    if (!confirm(`¿Quitar ${subject.name} del catálogo de materias? Los cursos ya creados no se borran.`)) return;
    const next = this.subjects().filter(s => s.id !== subject.id);
    this.subjectCatalog.save(next).subscribe({
      next: (list) => {
        this.subjects.set(list);
        this.saved.set('Materia quitada del catálogo.');
      },
      error: () => this.error.set('No se pudo quitar la materia.'),
    });
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
