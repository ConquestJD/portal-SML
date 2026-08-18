import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminService,
  AcademicYearItem,
  CreateAcademicYearDto,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';
import { PredefinedSubject, SchoolLevel } from '../../../shared/data/predefined-subjects';
import { SubjectCatalogService } from '../../../shared/data/subject-catalog.service';

type TabId = 'colegio' | 'materias' | 'anio' | 'pensiones';

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
  imports: [CommonModule, FormsModule, DatePipe, ...ADMIN_SHARED],
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
    { id: 'anio', label: 'Año lectivo' },
    { id: 'pensiones', label: 'Pensiones' },
  ];

  schoolData = signal<SchoolIdentity>({ ...DEFAULT_IDENTITY });
  years = signal<AcademicYearItem[]>([]);
  subjects = signal<PredefinedSubject[]>([]);

  subjectFormOpen = signal(false);
  subjectEditId = signal('');
  subjectForm = signal({
    name: '',
    codePrefix: '',
    color: '#003366',
    inicial: false,
    primaria: true,
    secundaria: true,
  });

  yearFormOpen = signal(false);
  yearEditId = signal('');
  yearForm = signal<CreateAcademicYearDto>({ name: '', startDate: '', endDate: '', status: 'UPCOMING' });

  monthlyTuitionAmount = signal(250);
  applyToPending = signal(false);
  tuitionSaving = signal(false);

  activeYear = computed(() =>
    this.years().find(y => this.yearStatusKey(y.status) === 'active') ?? this.years()[0] ?? null
  );

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
    const map: Record<SchoolLevel, string> = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
    return levels.map(l => map[l]).filter(Boolean).join(', ') || '—';
  }

  openSubjectForm(subject?: PredefinedSubject) {
    if (subject) {
      this.subjectEditId.set(subject.id);
      this.subjectForm.set({
        name: subject.name,
        codePrefix: subject.codePrefix,
        color: subject.color,
        inicial: subject.levels.includes('inicial'),
        primaria: subject.levels.includes('primaria'),
        secundaria: subject.levels.includes('secundaria'),
      });
    } else {
      this.subjectEditId.set('');
      this.subjectForm.set({
        name: '',
        codePrefix: '',
        color: '#003366',
        inicial: false,
        primaria: true,
        secundaria: true,
      });
    }
    this.subjectFormOpen.set(true);
  }

  cancelSubjectForm() {
    this.subjectFormOpen.set(false);
    this.subjectEditId.set('');
  }

  patchSubject(field: 'name' | 'codePrefix' | 'color', value: string) {
    this.subjectForm.update(d => {
      const next = { ...d, [field]: value };
      if (field === 'name' && !this.subjectEditId()) {
        next.codePrefix = this.subjectCatalog.prefixFromName(value);
      }
      return next;
    });
  }

  toggleSubjectLevel(level: 'inicial' | 'primaria' | 'secundaria', on: boolean) {
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
    if (f.inicial) levels.push('inicial');
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
