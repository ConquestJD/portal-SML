import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, StudentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import { CarnetFaceComponent } from './carnet-face.component';
import { CarnetPrintData, printStudentCarnets } from './print-carnet';

@Component({
  selector: 'app-carnets-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CarnetFaceComponent, ...ADMIN_SHARED],
  templateUrl: './carnets-admin.component.html',
  styleUrl: './carnets-admin.component.css',
})
export class CarnetsAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  students = signal<StudentItem[]>([]);
  preview = signal<StudentItem | null>(null);

  private _search = signal('');
  get searchQuery(): string { return this._search(); }
  set searchQuery(v: string) { this._search.set(v); }

  private _grade = signal('');
  get filterGrade(): string { return this._grade(); }
  set filterGrade(v: string) { this._grade.set(v); }

  availableGrades = computed(() =>
    Array.from(new Set(this.students().map((s) => s.grade ?? '').filter(Boolean))).sort(),
  );

  filtered = computed(() => {
    const q = this._search().trim().toLowerCase();
    const grade = this._grade();
    return this.students().filter((s) => {
      if (grade && s.grade !== grade) return false;
      if (s.status && s.status !== 'activo') return false;
      if (!q) return true;
      const text = `${s.name ?? ''} ${this.studentCode(s)}`.toLowerCase();
      return text.includes(q);
    });
  });

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.loadAll(1, []);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.preview()) this.closePreview();
  }

  private loadAll(page: number, acc: StudentItem[]) {
    this.admin.getStudents({ page, pageSize: 100 }).subscribe({
      next: ({ data, meta }) => {
        const next = acc.concat(data);
        if (page < (meta.totalPages || 1)) {
          this.loadAll(page + 1, next);
          return;
        }
        this.students.set(next);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los carnets.');
        this.loading.set(false);
      },
    });
  }

  studentCode(s: StudentItem): string {
    return (s.code || s.studentCode || s.username || '').trim();
  }

  fullName(s: StudentItem): string {
    return (s.name || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`).trim();
  }

  gradeLine(s: StudentItem): string {
    return [s.grade, s.level].filter(Boolean).join(' · ');
  }

  openPreview(s: StudentItem) {
    if (!this.studentCode(s)) return;
    this.preview.set(s);
  }

  closePreview() {
    this.preview.set(null);
  }

  printOne(s: StudentItem) {
    const data = this.toPrint(s);
    if (!data) return;
    printStudentCarnets([data]);
  }

  printPreview() {
    const s = this.preview();
    if (s) this.printOne(s);
  }

  printVisible() {
    printStudentCarnets(
      this.filtered().map((s) => this.toPrint(s)).filter((x): x is CarnetPrintData => !!x),
    );
  }

  private toPrint(s: StudentItem): CarnetPrintData | null {
    const code = this.studentCode(s);
    if (!code) return null;
    return {
      fullName: this.fullName(s),
      code,
      grade: s.grade ?? '',
      level: s.level ?? '',
      photoUrl: s.photo,
    };
  }
}
