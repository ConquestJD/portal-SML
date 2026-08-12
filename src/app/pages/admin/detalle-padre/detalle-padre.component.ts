import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService, ParentItem, StudentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

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
  activeTab = signal('perfil');
  parentId = '';

  readonly tabs: AdminTab[] = [
    { id: 'perfil', label: 'Perfil', icon: 'fa-user' },
    { id: 'hijos',  label: 'Hijos',  icon: 'fa-child' },
    { id: 'pagos',  label: 'Pagos',  icon: 'fa-file-invoice-dollar' },
  ];

  parent = signal<any>(null);
  children = signal<any[]>([]);
  payments = signal<unknown[]>([]);

  // ─── Vincular hijos ────────────────────────────────────────────────────
  showLinkPanel = signal(false);
  allStudents = signal<StudentItem[]>([]);
  loadingStudents = signal(false);
  linkSearch = signal('');
  selectedStudentIds = signal<Set<string>>(new Set());
  linkAsPrimary = signal(false);
  linkLoading = signal(false);
  linkError = signal('');

  availableStudents = computed(() => {
    const linkedIds = new Set(
      this.children()
        .map(c => c?.id ?? c?.studentId ?? c?.student?.id)
        .filter((id: unknown): id is string => !!id)
    );
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

  selectTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'hijos') this.loadChildren();
    if (tab === 'pagos') this.loadPayments();
  }

  loadChildren() {
    this.adminService.getParentChildren(this.parentId).subscribe({
      next: (data) => this.children.set(this.normalizeChildren(data as any[]))
    });
  }

  /** El backend puede devolver:
   *  - estudiantes "planos": { id, name, grade, ... }
   *  - relaciones padre-hijo:   { id (relación), student: {...}, isPrimary, relationship }
   * Siempre dejamos un objeto plano para la plantilla.
   */
  private normalizeChildren(raw: any[]): any[] {
    return (raw ?? []).map(c => {
      const s = c?.student ?? c;
      const u = s?.user ?? c?.user ?? {};
      const fallbackName = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || s?.studentCode || '(sin nombre)';
      return {
        id: s?.id ?? c?.studentId ?? c?.id ?? '',
        name: s?.name ?? c?.name ?? fallbackName,
        grade: s?.grade ?? c?.grade ?? s?.section?.grade ?? '',
        level: s?.level ?? c?.level ?? '',
        relationship: c?.relationship ?? s?.relationship ?? '',
        status: s?.status ?? u?.status ?? c?.status ?? '',
        enrollmentDate: c?.enrollmentDate ?? s?.enrollmentDate ?? null,
        isPrimary: !!(c?.isPrimary ?? s?.isPrimary),
        studentCode: s?.studentCode ?? s?.code ?? c?.studentCode ?? '',
      };
    });
  }

  loadPayments() {
    this.adminService.getParentPayments(this.parentId).subscribe({
      next: (data) => this.payments.set(data)
    });
  }

  setTab(tab: string) { this.selectTab(tab); }

  resetPassword() {
    if (!this.parentId) return;
    this.adminService.resetUserPassword(this.parentId).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  onResetPassword() { this.resetPassword(); }

  // ─── Vincular hijos ────────────────────────────────────────────────────
  openLinkPanel() {
    this.showLinkPanel.set(true);
    this.linkError.set('');
    this.selectedStudentIds.set(new Set());
    this.linkSearch.set('');
    this.linkAsPrimary.set(false);
    this.loadStudentsForLink();
  }

  closeLinkPanel() {
    this.showLinkPanel.set(false);
    this.linkError.set('');
  }

  private loadStudentsForLink() {
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
      next: (results: any[]) => {
        this.linkLoading.set(false);
        const failures = results.filter(r => r && (r as any).error);
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

  unlinkChild(child: any) {
    const childId = child?.id ?? child?.studentId ?? child?.student?.id;
    const fallbackName = `${child?.user?.firstName ?? ''} ${child?.user?.lastName ?? ''}`.trim() || 'este estudiante';
    const childName = child?.name ?? fallbackName;
    if (!childId) return;
    if (!confirm(`¿Desvincular a ${childName} de este apoderado?`)) return;

    this.adminService.unlinkParent(childId, this.parentId).subscribe({
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
    const fallback = `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || '(sin nombre)';
    return s.name ?? fallback;
  }

  // ─── Helpers de plantilla existente ────────────────────────────────────
  getFullName(): string {
    const p = this.parent();
    if (!p) return '';
    return p.name ?? `${p.user.firstName} ${p.user.lastName}`;
  }

  getHeroSubtitle(): string {
    const p = this.parent();
    if (!p) return '';
    const rel = p.relationship ?? '';
    const email = p.email ?? '';
    const parts = [rel, email].filter(Boolean);
    return parts.join(' · ');
  }
  get padre() { return this.parent; }
  totalPaid = () => (this.payments() as any[]).filter(p => p.status === 'PAID').reduce((a, p) => a + (p.amount ?? 0), 0);
  totalPending = () => (this.payments() as any[]).filter(p => p.status !== 'PAID').reduce((a, p) => a + (p.amount ?? 0), 0);
  paidPayments = () => (this.payments() as any[]).filter(p => p.status === 'PAID');
  pendingPayments = () => (this.payments() as any[]).filter(p => p.status !== 'PAID');
}
