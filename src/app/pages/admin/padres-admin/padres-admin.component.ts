import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AdminService, ParentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

interface ChildSummary {
  id: string;
  name: string;
  grade: string;
}

interface ParentRow extends ParentItem {
  childrenList: ChildSummary[];
  childrenCount: number;
}

@Component({
  selector: 'app-padres-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
  templateUrl: './padres-admin.component.html',
  styleUrl: './padres-admin.component.css'
})
export class PadresAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  total = signal(0);

  padres = signal<ParentRow[]>([]);

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  filteredPadres = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const list = this.padres();
    if (!q) return list;
    return list.filter(p => {
      const name = (p.name ?? `${p.user.firstName} ${p.user.lastName}`).toLowerCase();
      const email = (p.email ?? p.user.email ?? '').toLowerCase();
      const phone = (p.phone ?? p.user.phone ?? '').toLowerCase();
      const dni = (p.dni ?? '').toLowerCase();
      const childrenText = (p.childrenList ?? [])
        .map(c => `${c.name} ${c.grade}`)
        .join(' ')
        .toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        dni.includes(q) ||
        childrenText.includes(q)
      );
    });
  });

  totalChildren = computed(() => this.padres().reduce((sum, p) => sum + p.childrenCount, 0));
  activeCount = computed(() =>
    this.padres().filter(p => (p.status ?? p.user?.status) === 'ACTIVE').length
  );

  hasActiveFilters = computed(() => !!this._searchQuery() || !!this._filterStatus());

  resetFilters() {
    this._searchQuery.set('');
    if (this._filterStatus()) {
      this._filterStatus.set('');
      this.load();
    }
  }

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const statusMap: Record<string, string> = { activo: 'ACTIVE', inactivo: 'INACTIVE' };
    this.adminService.getParents({
      status: statusMap[this._filterStatus()] || undefined,
      page: 1,
      pageSize: 100,
    }).pipe(
      switchMap(({ data, meta }) => {
        if (!data.length) return of({ rows: [] as ParentRow[], total: meta.total });
        const enriched$ = data.map(p => this.enrichWithChildren(p));
        return forkJoin(enriched$).pipe(map(rows => ({ rows, total: meta.total })));
      })
    ).subscribe({
      next: ({ rows, total }) => {
        this.padres.set(rows);
        this.total.set(total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar padres');
        this.loading.set(false);
      },
    });
  }

  private enrichWithChildren(p: ParentItem) {
    if (p.childrenList && p.childrenList.length) {
      return of(this.toRow(p, p.childrenList as ChildSummary[]));
    }
    return this.adminService.getParentChildren(p.id).pipe(
      map(raw => this.toRow(p, this.normalizeChildren(raw))),
      catchError(() => of(this.toRow(p, [])))
    );
  }

  private toRow(p: ParentItem, children: ChildSummary[]): ParentRow {
    return { ...p, childrenList: children, childrenCount: children.length };
  }

  private normalizeChildren(raw: unknown[]): ChildSummary[] {
    return (raw ?? []).map((c: any) => {
      const s = c?.student ?? c;
      const u = s?.user ?? c?.user ?? {};
      const id = s?.id ?? c?.studentId ?? c?.id ?? '';
      const first = u?.firstName ?? s?.firstName ?? '';
      const last = u?.lastName ?? s?.lastName ?? '';
      const fallbackName = `${first} ${last}`.trim() || s?.studentCode || '(estudiante)';
      const name = s?.name ?? c?.name ?? fallbackName;
      const grade = s?.grade ?? c?.grade ?? s?.section?.grade ?? '';
      return { id, name, grade };
    });
  }

  getFullName(p: ParentItem): string {
    return p.name ?? `${p.user.firstName} ${p.user.lastName}`;
  }

  getInitials(p: ParentItem): string {
    const full = this.getFullName(p).trim();
    if (!full) return '?';
    const parts = full.split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  toggleStatus(p: ParentItem) {
    const current = (p as any).status ?? p.user?.status;
    const isActive = current === 'ACTIVE' || current === 'activo';
    const next = isActive ? 'INACTIVE' : 'ACTIVE';
    this.adminService.patchUserStatus(p.user?.id ?? p.id, next).subscribe({
      next: () => this.load(),
    });
  }

  clearSearch() { this._searchQuery.set(''); }
}
