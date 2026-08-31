import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminService,
  CampusAttendanceDay,
  CampusAttendanceRow,
  CampusScanStudent,
  StudentItem,
  activeAcademicYear,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

type GateFilter = 'all' | 'in' | 'late' | 'absent';

@Component({
  selector: 'app-ingreso-diario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
  templateUrl: './ingreso-diario.component.html',
  styleUrl: './ingreso-diario.component.css',
})
export class IngresoDiarioComponent implements OnInit, OnDestroy {
  loading = signal(true);
  error = signal('');
  date = signal(limaDate());
  day = signal<CampusAttendanceDay | null>(null);
  roster = signal<CampusAttendanceRow[]>([]);
  search = signal('');
  filter = signal<GateFilter>('all');
  grade = signal('');

  readonly today = limaDate();
  readonly cutoff = computed(() => this.day()?.lateCutoff || '08:10');
  readonly isToday = computed(() => this.date() === this.today);

  readonly dateLabel = computed(() => formatLongDate(this.date()));

  readonly present = computed(() => this.roster().filter((r) => r.status === 'PRESENT').length);
  readonly late = computed(() => this.roster().filter((r) => r.status === 'LATE').length);
  readonly inCount = computed(() => this.present() + this.late());
  readonly expected = computed(() => this.roster().length);
  readonly absent = computed(() => this.roster().filter((r) => r.status === 'ABSENT').length);

  readonly grades = computed(() => {
    const names = this.roster().map((r) => r.student.grade).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => compareGrades(a, b));
  });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const filter = this.filter();
    const grade = this.grade();
    return this.roster().filter((row) => {
      if (grade && row.student.grade !== grade) return false;
      if (filter === 'in' && row.status === 'ABSENT') return false;
      if (filter === 'late' && row.status !== 'LATE') return false;
      if (filter === 'absent' && row.status !== 'ABSENT') return false;
      if (q) {
        const hay = `${row.student.fullName} ${row.student.studentCode} ${row.student.grade}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  readonly grouped = computed(() => {
    const groups = new Map<string, CampusAttendanceRow[]>();
    for (const row of this.filtered()) {
      const key = (row.student.grade || '').trim() || 'Sin grado';
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => compareGrades(a, b))
      .map(([grade, rows]) => ({
        grade,
        level: rows.find((r) => r.student.level)?.student.level ?? '',
        rows,
      }));
  });

  private poll?: ReturnType<typeof setInterval>;
  private students: StudentItem[] = [];

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.admin.getAcademicYears().subscribe({
      next: (years) => {
        const yearId = activeAcademicYear(years)?.id;
        this.admin.getStudents({ pageSize: 500, academicYearId: yearId }).subscribe({
          next: ({ data }) => {
            this.students = (data ?? []).filter(
              (s) => s.enrollmentKind === 'active' || s.enrollmentKind === 'late',
            );
            this.load();
          },
          error: () => this.load(),
        });
      },
      error: () => this.load(),
    });
    this.poll = setInterval(() => {
      if (this.isToday()) this.load(true);
    }, 15000);
  }

  ngOnDestroy() {
    clearInterval(this.poll);
  }

  load(silent = false) {
    if (!silent) this.loading.set(true);
    this.error.set('');
    this.admin.getCampusAttendance(this.date()).subscribe({
      next: (day) => {
        this.day.set(day);
        this.roster.set(day.roster?.length ? day.roster : this.mergeRoster(day));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el ingreso del día.');
        this.loading.set(false);
      },
    });
  }

  setDate(value: string) {
    if (!value || value === this.date()) return;
    this.date.set(value);
    this.load();
  }

  shiftDay(delta: number) {
    const next = addDays(this.date(), delta);
    if (next > this.today) return;
    this.setDate(next);
  }

  setFilter(value: string) {
    this.filter.set(value as GateFilter);
  }

  statusLabel(status: string): string {
    if (status === 'LATE') return 'Tardanza';
    if (status === 'PRESENT') return 'A tiempo';
    return 'Sin ingreso';
  }

  statusKind(status: string): string {
    if (status === 'LATE') return 'late';
    if (status === 'PRESENT') return 'ok';
    return 'none';
  }

  formatTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  photoOf(student: CampusScanStudent): string | null {
    return student.photoUrl || null;
  }

  private mergeRoster(day: CampusAttendanceDay): CampusAttendanceRow[] {
    const byId = new Map(day.records.map((r) => [r.student.id, r]));
    const seen = new Set<string>();
    const rows: CampusAttendanceRow[] = [];

    for (const s of this.students) {
      seen.add(s.id);
      const rec = byId.get(s.id);
      rows.push({
        id: rec?.id ?? `absent-${s.id}`,
        status: rec?.status ?? 'ABSENT',
        scannedAt: rec?.scannedAt ?? null,
        student: {
          id: s.id,
          studentCode: s.studentCode || s.code || '',
          firstName: s.user?.firstName ?? '',
          lastName: s.user?.lastName ?? '',
          fullName: (s.name || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`).trim(),
          grade: s.grade ?? '',
          level: s.level ?? '',
          photoUrl: s.photo || s.user?.avatarUrl || null,
        },
      });
    }

    for (const rec of day.records) {
      if (seen.has(rec.student.id)) continue;
      rows.push({
        id: rec.id,
        status: rec.status,
        scannedAt: rec.scannedAt,
        student: rec.student,
      });
    }

    return rows.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName, 'es'));
  }
}

function limaDate(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function addDays(iso: string, delta: number): string {
  const [y, m, day] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + delta));
  return dt.toISOString().slice(0, 10);
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const label = dt.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const GRADE_ORDER = [
  '1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria',
  '1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria',
];

function compareGrades(a: string, b: string): number {
  const ia = GRADE_ORDER.indexOf(a);
  const ib = GRADE_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b, 'es');
}
