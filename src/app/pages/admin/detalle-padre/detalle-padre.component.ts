import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, ParentItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

@Component({
  selector: 'app-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ...ADMIN_SHARED],
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

  resetPassword() {
    if (!this.parentId) return;
    this.adminService.resetUserPassword(this.parentId).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  parent = signal<any>(null);
  children = signal<unknown[]>([]);
  payments = signal<unknown[]>([]);

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit() {
    this.parentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadParent();
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
      next: (data) => this.children.set(data)
    });
  }

  loadPayments() {
    this.adminService.getParentPayments(this.parentId).subscribe({
      next: (data) => this.payments.set(data)
    });
  }

  setTab(tab: string) { this.selectTab(tab); }
  getFullName(): string {
    const p = this.parent();
    if (!p) return '';
    return p.name ?? `${p.user.firstName} ${p.user.lastName}`;
  }
  get padre() { return this.parent; }
  getLevelLabel(level: string): string {
    const m: Record<string, string> = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
    return m[(level ?? '').toLowerCase()] ?? (level ?? '');
  }
  totalPaid = () => (this.payments() as any[]).filter(p => p.status === 'PAID').reduce((a, p) => a + (p.amount ?? 0), 0);
  totalPending = () => (this.payments() as any[]).filter(p => p.status !== 'PAID').reduce((a, p) => a + (p.amount ?? 0), 0);
  paidPayments = () => (this.payments() as any[]).filter(p => p.status === 'PAID');
  pendingPayments = () => (this.payments() as any[]).filter(p => p.status !== 'PAID');
}
