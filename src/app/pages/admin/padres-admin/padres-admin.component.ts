import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, ParentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

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
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  selectedGrade = signal('');

  padres = signal<ParentItem[]>([]);

  // Getter/setter pairs so [(ngModel)] works with signals
  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  // Static school grade list (used to group parents by child's grade)
  availableGrades = signal([
    '1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria',
    '1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'
  ]);

  filteredPadres = computed(() => {
    let list = this.padres();
    const q = this._searchQuery().toLowerCase();
    if (q) {
      list = list.filter(p =>
        (p.name ?? `${p.user.firstName} ${p.user.lastName}`).toLowerCase().includes(q) ||
        (p.email ?? p.user.email).toLowerCase().includes(q) ||
        (p.phone ?? p.user.phone ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const statusMap: Record<string, string> = { activo: 'ACTIVE', inactivo: 'INACTIVE' };
    this.adminService.getParents({
      status: statusMap[this._filterStatus()] || undefined,
      page: this.currentPage(),
      pageSize: 100
    }).subscribe({
      next: ({ data, meta }) => {
        this.padres.set(data);
        this.totalPages.set(meta.totalPages);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar padres'); this.loading.set(false); }
    });
  }

  selectGrade(grade: string) { this.selectedGrade.set(grade); }

  getParentsCountByGrade(grade: string): number {
    return this.padres().filter(p =>
      (p.childrenList ?? []).some((c: any) => c.grade === grade)
    ).length;
  }

  getChildrenInGrade(padre: ParentItem, grade: string): { id: string; name: string; grade: string }[] {
    return (padre.childrenList ?? []).filter((c: any) => c.grade === grade);
  }

  getRelationshipLabel(rel: string | undefined): string {
    const map: Record<string, string> = { Padre: 'Padre', Madre: 'Madre', Tutor: 'Tutor', Abuelo: 'Abuelo', Abuela: 'Abuela', Tío: 'Tío', Tía: 'Tía' };
    return rel ? (map[rel] ?? rel) : '-';
  }

  getFullName(p: ParentItem): string { return p.name ?? `${p.user.firstName} ${p.user.lastName}`; }

  toggleStatus(p: ParentItem) {
    const current = (p as any).status ?? p.user?.status;
    const isActive = current === 'ACTIVE' || current === 'activo';
    const next = isActive ? 'INACTIVE' : 'ACTIVE';
    this.adminService.patchUserStatus(p.user?.id ?? p.id, next).subscribe({
      next: () => this.load(),
    });
  }
}
