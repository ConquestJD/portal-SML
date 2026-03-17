import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, ParentItem } from '../../../services/admin.service';

@Component({
  selector: 'app-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './detalle-padre.component.html',
  styleUrl: './detalle-padre.component.css'
})
export class DetallePadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  activeTab = signal('perfil');
  parentId = '';

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
  getLevelLabel(level: string): string { return level ?? ''; }
  get totalPaid(): number { return (this.payments() as any[]).filter((p: any) => p.status === 'PAID').reduce((a: number, p: any) => a + (p.amount ?? 0), 0); }
  get totalPending(): number { return (this.payments() as any[]).filter((p: any) => p.status !== 'PAID').reduce((a: number, p: any) => a + (p.amount ?? 0), 0); }
  get pendingPayments(): any[] { return (this.payments() as any[]).filter((p: any) => p.status !== 'PAID'); }
  getPaymentStatusClass(status: string): string {
    const m: Record<string, string> = { PAID: 'badge-success', PENDING: 'badge-warning', OVERDUE: 'badge-danger', CANCELLED: 'badge-secondary' };
    return m[status] ?? 'badge-secondary';
  }
  getPaymentStatusLabel(status: string): string {
    const m: Record<string, string> = { PAID: 'Pagado', PENDING: 'Pendiente', OVERDUE: 'Vencido', CANCELLED: 'Cancelado' };
    return m[status] ?? status;
  }
}
