import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService, ParentItem, StudentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

interface ChildView {
  id: string;
  name: string;
  grade: string;
  level: string;
  relationship: string;
  status: string;
  enrollmentDate: string | null;
  isPrimary: boolean;
  studentCode: string;
}

interface PaymentView {
  id: string;
  concept: string;
  amount: number;
  dueDate?: string;
  status: string;
}

@Component({
  selector: 'app-detalle-padre',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule, ...ADMIN_SHARED],
  templateUrl: './detalle-padre.component.html',
  styleUrl: './detalle-padre.component.css'
})
export class DetallePadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  activeTab = signal('ficha');
  parentId = '';

  readonly tabs: AdminTab[] = [
    { id: 'ficha', label: 'Ficha' },
    { id: 'hijos', label: 'Hijos' },
    { id: 'pagos', label: 'Pagos' },
  ];

  parent = signal<ParentItem | null>(null);
  children = signal<ChildView[]>([]);
  payments = signal<PaymentView[]>([]);

  showLinkPanel = signal(false);
  allStudents = signal<StudentItem[]>([]);
  loadingStudents = signal(false);
  linkSearch = signal('');
  selectedStudentIds = signal<Set<string>>(new Set());
  linkAsPrimary = signal(false);
  linkLoading = signal(false);
  linkError = signal('');

  availableStudents = computed(() => {
    const linkedIds = new Set(this.children().map(c => c.id).filter(Boolean));
    const q = this.linkSearch().trim().toLowerCase();
    return this.allStudents()
      .filter(s => !linkedIds.has(s.id))
      .filter(s => {
        if (!q) return true;
        const name = (s.name ?? `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`).toLowerCase();
        const dni = (s.dni ?? '').toLowerCase();
        const code = (s.studentCode ?? s.code ?? '').toLowerCase();
        const grade = (s.grade ?? '').toLowerCase();
        return name.includes(q) || dni.includes(q) || code.includes(q) || grade.includes(q);
      });
  });

  selectedCount = computed(() => this.selectedStudentIds().size);

  paidPayments = computed(() => this.payments().filter(p => p.status === 'PAID'));
  pendingPayments = computed(() => this.payments().filter(p => p.status !== 'PAID'));
  totalPaid = computed(() => this.paidPayments().reduce((a, p) => a + (p.amount ?? 0), 0));
  totalPending = computed(() => this.pendingPayments().reduce((a, p) => a + (p.amount ?? 0), 0));

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit() {
    this.parentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadParent();
    this.loadChildren();
  }

  loadParent() {
    this.loading.set(true);
    this.adminService.getParent(this.parentId).subscribe({
      next: (data) => { this.parent.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el apoderado'); this.loading.set(false); }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'hijos') this.loadChildren();
    if (tab === 'pagos') this.loadPayments();
  }

  loadChildren() {
    this.adminService.getParentChildren(this.parentId).subscribe({
      next: (data) => this.children.set(this.normalizeChildren(data as Record<string, unknown>[])),
    });
  }

  private normalizeChildren(raw: Record<string, unknown>[]): ChildView[] {
    return (raw ?? []).map(c => {
      const s = (c['student'] as Record<string, unknown> | undefined) ?? c;
      const u = (s['user'] as Record<string, unknown> | undefined) ?? (c['user'] as Record<string, unknown> | undefined) ?? {};
      const fallbackName = `${u['firstName'] ?? ''} ${u['lastName'] ?? ''}`.toString().trim() || String(s['studentCode'] ?? '(sin nombre)');
      return {
        id: String(s['id'] ?? c['studentId'] ?? c['id'] ?? ''),
        name: String(s['name'] ?? c['name'] ?? fallbackName),
        grade: String(s['grade'] ?? c['grade'] ?? ''),
        level: String(s['level'] ?? c['level'] ?? ''),
        relationship: String(c['relationship'] ?? s['relationship'] ?? ''),
        status: String(s['status'] ?? u['status'] ?? c['status'] ?? ''),
        enrollmentDate: (c['enrollmentDate'] ?? s['enrollmentDate'] ?? null) as string | null,
        isPrimary: !!(c['isPrimary'] ?? s['isPrimary']),
        studentCode: String(s['studentCode'] ?? s['code'] ?? c['studentCode'] ?? ''),
      };
    });
  }

  loadPayments() {
    this.adminService.getParentPayments(this.parentId).subscribe({
      next: (data) => this.payments.set(this.normalizePayments(data as Record<string, unknown>[])),
    });
  }

  private normalizePayments(raw: Record<string, unknown>[]): PaymentView[] {
    return (raw ?? []).map((p, i) => ({
      id: String(p['id'] ?? i),
      concept: String(p['concept'] ?? p['description'] ?? 'Pago'),
      amount: Number(p['amount'] ?? 0),
      dueDate: p['dueDate'] as string | undefined,
      status: String(p['status'] ?? ''),
    }));
  }

  getFullName(): string {
    const p = this.parent();
    if (!p) return '';
    return (p.name ?? `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`).trim();
  }

  parentUsername(): string {
    const p = this.parent();
    return p?.username || p?.dni || p?.user?.username || '—';
  }

  relationship(): string {
    return this.parent()?.relationship || 'Apoderado';
  }

  onResetPassword() {
    const userId = this.parent()?.user?.id;
    if (!userId) return;
    this.adminService.resetUserPassword(userId).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  openLinkPanel() {
    this.showLinkPanel.set(true);
    this.linkError.set('');
    this.selectedStudentIds.set(new Set());
    this.linkSearch.set('');
    this.linkAsPrimary.set(false);
    this.loadingStudents.set(true);
    this.adminService.getStudents({ pageSize: 100 }).subscribe({
      next: ({ data }) => {
        this.allStudents.set(data);
        this.loadingStudents.set(false);
      },
      error: () => {
        this.linkError.set('No se pudo cargar el listado de estudiantes.');
        this.loadingStudents.set(false);
      },
    });
  }

  closeLinkPanel() {
    this.showLinkPanel.set(false);
    this.linkError.set('');
  }

  toggleStudent(id: string) {
    this.selectedStudentIds.update(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isStudentSelected(id: string): boolean {
    return this.selectedStudentIds().has(id);
  }

  setLinkSearch(v: string) { this.linkSearch.set(v); }
  setLinkAsPrimary(v: boolean) { this.linkAsPrimary.set(v); }

  linkSelected() {
    const ids = Array.from(this.selectedStudentIds());
    if (!ids.length) {
      this.linkError.set('Selecciona al menos un estudiante.');
      return;
    }
    this.linkLoading.set(true);
    this.linkError.set('');
    const isPrimary = this.linkAsPrimary();
    const calls = ids.map(studentId =>
      this.adminService.linkParent(studentId, this.parentId, isPrimary).pipe(
        catchError((err: unknown) => of({ error: err, studentId }))
      )
    );

    forkJoin(calls).subscribe({
      next: (results: unknown[]) => {
        this.linkLoading.set(false);
        const failures = results.filter(r => r && typeof r === 'object' && 'error' in (r as object));
        if (failures.length === ids.length) {
          this.linkError.set('No se pudo vincular ningún estudiante. Inténtalo de nuevo.');
          return;
        }
        if (failures.length) {
          this.linkError.set(`Se vincularon ${ids.length - failures.length} de ${ids.length}. Algunos fallaron.`);
        } else {
          this.closeLinkPanel();
        }
        this.loadChildren();
      },
      error: () => {
        this.linkLoading.set(false);
        this.linkError.set('Error al vincular estudiantes.');
      },
    });
  }

  unlinkChild(child: ChildView) {
    if (!child.id) return;
    if (!confirm(`¿Desvincular a ${child.name} de este apoderado?`)) return;
    this.adminService.unlinkParent(child.id, this.parentId).subscribe({
      next: () => this.loadChildren(),
      error: () => alert('No se pudo desvincular al estudiante.'),
    });
  }

  getStudentInitials(s: StudentItem): string {
    const name = s.name ?? `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getStudentDisplayName(s: StudentItem): string {
    return s.name ?? `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || '(sin nombre)';
  }
}
