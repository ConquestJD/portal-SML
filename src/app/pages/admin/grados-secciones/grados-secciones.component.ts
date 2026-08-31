import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, SectionItem, AcademicYearItem, CreateSectionDto, activeAcademicYear } from '../../../services/admin.service';

@Component({
  selector: 'app-grados-secciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grados-secciones.component.html',
  styleUrl: './grados-secciones.component.css'
})
export class GradosSeccionesComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  editId = signal('');
  academicYears = signal<AcademicYearItem[]>([]);
  sections = signal<SectionItem[]>([]);

  formData = signal<CreateSectionDto>({
    name: '', grade: '', level: '', academicYearId: '', capacity: 30
  });

  levels = ['Inicial', 'Primaria', 'Secundaria'];
  grades: Record<string, string[]> = {
    Inicial: ['3 años', '4 años', '5 años'],
    Primaria: ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'],
    Secundaria: ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria']
  };

  readonly levelOrder = ['Inicial', 'Primaria', 'Secundaria'];

  sectionsByLevel = computed(() => {
    const groups = new Map<string, SectionItem[]>();
    for (const s of this.sections()) {
      const level = s.level?.trim() || 'Sin nivel';
      const list = groups.get(level) ?? [];
      list.push(s);
      groups.set(level, list);
    }

    const ordered: { level: string; sections: SectionItem[] }[] = [];
    for (const level of this.levelOrder) {
      const match = [...groups.keys()].find(k => k.toLowerCase() === level.toLowerCase());
      if (match) {
        ordered.push({
          level: match,
          sections: groups.get(match)!.slice().sort((a, b) =>
            `${a.grade} ${a.name}`.localeCompare(`${b.grade} ${b.name}`, 'es')
          )
        });
        groups.delete(match);
      }
    }
    for (const [level, list] of groups) {
      ordered.push({
        level,
        sections: list.slice().sort((a, b) =>
          `${a.grade} ${a.name}`.localeCompare(`${b.grade} ${b.name}`, 'es')
        )
      });
    }
    return ordered;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({
      next: (data) => {
        this.academicYears.set(data);
        this.load();
      },
      error: () => this.load(),
    });
  }

  load() {
    this.loading.set(true);
    const yearId = activeAcademicYear(this.academicYears())?.id;
    this.adminService.getSections({ academicYearId: yearId }).subscribe({
      next: ({ data }) => { this.sections.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar secciones'); this.loading.set(false); }
    });
  }

  save() {
    let dto = this.formData();
    if (!dto.academicYearId) {
      dto = { ...dto, academicYearId: activeAcademicYear(this.academicYears())?.id ?? '' };
      this.formData.set(dto);
    }
    if (!dto.academicYearId) {
      this.error.set('No hay año lectivo vigente.');
      return;
    }
    const obs = this.editId()
      ? this.adminService.updateSection(this.editId(), dto)
      : this.adminService.createSection(dto);
    obs.subscribe({ next: () => { this.showForm.set(false); this.editId.set(''); this.load(); } });
  }

  editSection(s: SectionItem) {
    this.editId.set(s.id);
    this.formData.set({
      name: s.name, grade: s.grade, level: s.level,
      academicYearId: s.academicYear.id, capacity: s.capacity
    });
    this.showForm.set(true);
  }

  cancelForm() { this.showForm.set(false); this.editId.set(''); }

  update(field: string, value: unknown) { this.formData.update(d => ({ ...d, [field]: value })); }

  getGradesForLevel(): string[] { return this.grades[this.formData().level] ?? []; }

  createSection() {
    this.showForm.set(true);
    this.editId.set('');
    const active = activeAcademicYear(this.academicYears());
    this.formData.set({ name: '', grade: '', level: '', academicYearId: active?.id ?? '', capacity: 30 });
  }

  enrolledOf(section: SectionItem): number {
    const anySec = section as SectionItem & { enrolled?: number };
    return anySec.enrolledCount ?? anySec.enrolled ?? 0;
  }

  occupancyPct(section: SectionItem): number {
    const cap = section.capacity || 0;
    if (cap <= 0) return 0;
    return Math.min(100, Math.round((this.enrolledOf(section) / cap) * 100));
  }
}
