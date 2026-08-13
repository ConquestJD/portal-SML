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

  private _filterRelationship = signal('');
  get filterRelationship(): string { return this._filterRelationship(); }
  set filterRelationship(v: string) { this._filterRelationship.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  availableRelationships = computed(() =>
    Array.from(new Set(
      this.padres().map(p => this.relationshipOf(p)).filter(r => r !== 'Sin relación')
    )).sort((a, b) => a.localeCompare(b, 'es'))
  );

  filteredPadres = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const rel = this._filterRelationship();
    const status = this._filterStatus();

    return this.padres().filter(p => {
      if (rel && this.relationshipOf(p) !== rel) return false;
      if (status === 'activo' && !this.isActive(p)) return false;
      if (status === 'inactivo' && this.isActive(p)) return false;
      if (q) {
        const name = this.getFullName(p).toLowerCase();
        const email = (p.email ?? p.user?.email ?? '').toLowerCase();
        const phone = (p.phone ?? p.user?.phone ?? '').toLowerCase();
        const dni = (p.dni ?? p.username ?? '').toLowerCase();
        const childrenText = (p.childrenList ?? []).map(c => `${c.name} ${c.grade}`).join(' ').toLowerCase();
        if (![name, email, phone, dni, childrenText].some(t => t.includes(q))) return false;
      }
      return true;
    });
  });

  groupedPadres = computed(() => {
    const groups = new Map<string, ParentRow[]>();
    for (const p of this.filteredPadres()) {
      const key = this.relationshipOf(p);
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Sin relación') return 1;
      if (b === 'Sin relación') return -1;
      return a.localeCompare(b, 'es');
    });
    return keys.map(relationship => ({
      relationship,
      parents: (groups.get(relationship) ?? []).slice().sort((a, b) =>
        this.getFullName(a).localeCompare(this.getFullName(b), 'es')
      ),
    }));
  });

  totalChildren = computed(() => this.padres().reduce((sum, p) => sum + p.childrenCount, 0));
  activeCount = computed(() => this.padres().filter(p => this.isActive(p)).length);

  hasActiveFilters = computed(() =>
    !!this._searchQuery() || !!this._filterRelationship() || !!this._filterStatus()
  );

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getParents({ page: 1, pageSize: 100 }).pipe(
      switchMap(({ data, meta }) => {
        if (!data.length) return of({ rows: [] as ParentRow[], total: meta.total });
        return forkJoin(data.map(p => this.enrichWithChildren(p))).pipe(
          map(rows => ({ rows, total: meta.total }))
        );
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

  resetFilters() {
    this._searchQuery.set('');
    this._filterRelationship.set('');
    this._filterStatus.set('');
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
    return (raw ?? []).map((row) => {
      const c = (row ?? {}) as Record<string, unknown>;
      const s = ((c['student'] as Record<string, unknown> | undefined) ?? c);
      const u = ((s['user'] as Record<string, unknown> | undefined) ?? (c['user'] as Record<string, unknown> | undefined) ?? {});
      const id = String(s['id'] ?? c['studentId'] ?? c['id'] ?? '');
      const first = String(u['firstName'] ?? s['firstName'] ?? '');
      const last = String(u['lastName'] ?? s['lastName'] ?? '');
      const fallbackName = `${first} ${last}`.trim() || String(s['studentCode'] ?? '(estudiante)');
      const name = String(s['name'] ?? c['name'] ?? fallbackName);
      const grade = String(s['grade'] ?? c['grade'] ?? '');
      return { id, name, grade };
    });
  }

  getFullName(p: ParentItem): string {
    return (p.name ?? `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`).trim() || '—';
  }

  getInitials(p: ParentItem): string {
    const full = this.getFullName(p);
    if (!full || full === '—') return '?';
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  relationshipOf(p: ParentItem): string {
    return (p.relationship ?? '').trim() || 'Sin relación';
  }

  parentUsername(p: ParentItem): string {
    return p.email || p.user?.email || '—';
  }

  childrenLabel(p: ParentRow): string {
    if (!p.childrenCount) return 'Sin hijos';
    return p.childrenList.map(c => c.grade ? `${c.name} (${c.grade})` : c.name).join(' · ');
  }

  isActive(p: ParentItem): boolean {
    const s = (p.status ?? p.user?.status ?? '').toLowerCase();
    return s === 'active' || s === 'activo';
  }
}
