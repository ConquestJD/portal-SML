import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child, ParentPayment } from '../../../services/parent.service';

export type PaymentStatusVm = 'completado' | 'pendiente' | 'proximo' | 'vencido';

export interface PaymentRowVm {
  id: string;
  concept: string;
  description: string;
  amount: number;
  status: PaymentStatusVm;
  category: string;
  dueDate: string | null;
  paymentDate: string | null;
  paymentMethod: string;
  receiptNumber: string;
}

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css',
})
export class PagosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  readonly isLoading = this.loading;
  selectedChildId = signal('');
  filterStatus = signal<'todos' | PaymentStatusVm>('todos');
  filterCategory = signal('todos');
  searchQuery = signal('');
  children = signal<Child[]>([]);
  payments = signal<ParentPayment[]>([]);

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  paymentRows = computed(() => this.payments().map((p) => this.mapPayment(p)));

  filteredPayments = computed(() => {
    let rows = this.paymentRows();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) => r.concept.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    const st = this.filterStatus();
    if (st !== 'todos') rows = rows.filter((r) => r.status === st);
    const cat = this.filterCategory();
    if (cat !== 'todos') rows = rows.filter((r) => r.category === cat);
    const rank: Record<PaymentStatusVm, number> = {
      vencido: 0,
      pendiente: 1,
      proximo: 2,
      completado: 3,
    };
    return [...rows].sort((a, b) => {
      const byStatus = rank[a.status] - rank[b.status];
      if (byStatus) return byStatus;
      return this.dueMs(a.dueDate) - this.dueMs(b.dueDate);
    });
  });

  summary = computed(() => {
    const rows = this.paymentRows();
    const sum = (status: PaymentStatusVm) =>
      rows.filter((r) => r.status === status).reduce((acc, r) => acc + r.amount, 0);
    const count = (status: PaymentStatusVm) => rows.filter((r) => r.status === status).length;
    return {
      total: rows.reduce((acc, r) => acc + r.amount, 0),
      completado: sum('completado'),
      pendiente: sum('pendiente'),
      proximo: sum('proximo'),
      vencido: sum('vencido'),
      completadosCount: count('completado'),
      pendientesCount: count('pendiente'),
      proximosCount: count('proximo'),
      vencidosCount: count('vencido'),
    };
  });

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) {
          this.selectedChildId.set(data[0].id);
          this.loadPayments(data[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.loadPayments(id);
  }

  loadPayments(childId: string) {
    this.loading.set(true);
    this.error.set('');
    this.parentService.getPayments(childId).subscribe({
      next: (data) => {
        this.payments.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar pagos');
        this.payments.set([]);
        this.loading.set(false);
      },
    });
  }

  setFilterStatus(status: 'todos' | PaymentStatusVm) {
    this.filterStatus.set(this.filterStatus() === status && status !== 'todos' ? 'todos' : status);
  }

  setFilterCategory(category: string) {
    this.filterCategory.set(category);
  }

  onSearchInput(event: Event) {
    const el = event.target as HTMLInputElement;
    this.searchQuery.set(el.value);
  }

  downloadReceipt(payment: PaymentRowVm) {
    const childId = this.selectedChildId();
    if (childId) window.open(this.parentService.getReceiptUrl(childId, payment.id));
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  getChildGrade(c: Child): string {
    const grade = c.grade ?? c.enrollments?.[0]?.section?.grade ?? '';
    const level = c.level ?? c.enrollments?.[0]?.section?.level ?? '';
    return [grade, level].filter(Boolean).join(' · ');
  }

  childPhoto(c: Child): string | null {
    return c.photo || c.user?.avatarUrl || null;
  }

  dueDay(raw: string | null): string {
    const d = this.asDate(raw);
    return d ? String(d.getDate()) : '—';
  }

  dueMonth(raw: string | null): string {
    const d = this.asDate(raw);
    if (!d) return 's/f';
    return d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  }

  dueLabel(raw: string | null): string {
    const d = this.asDate(raw);
    if (!d) return 'Sin fecha';
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getCategoryLabel(category: string): string {
    const map: Record<string, string> = {
      matricula: 'Matrícula',
      mensualidad: 'Mensualidad',
      materiales: 'Materiales',
      actividades: 'Actividades',
      otros: 'Otros',
    };
    return map[category] ?? category;
  }

  paymentStatusLabel(status: PaymentStatusVm): string {
    const map: Record<PaymentStatusVm, string> = {
      completado: 'Completado',
      pendiente: 'Pendiente',
      proximo: 'Próximo',
      vencido: 'Vencido',
    };
    return map[status];
  }

  private dueMs(raw: string | null): number {
    const d = this.asDate(raw);
    return d ? d.getTime() : Number.POSITIVE_INFINITY;
  }

  private asDate(raw: string | Date | null): Date | null {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private mapPayment(p: ParentPayment): PaymentRowVm {
    const raw = p as unknown as Record<string, unknown>;
    const status = this.normalizeStatus(String(p.status ?? ''));
    const category = String(p.category ?? 'otros').toLowerCase();
    return {
      id: String(p.id),
      concept: String(p.concept ?? ''),
      description: String(p.description ?? ''),
      amount: Number(p.amount) || 0,
      status,
      category,
      dueDate: p.dueDate ?? null,
      paymentDate: (raw['paymentDate'] as string) ?? null,
      paymentMethod: String(raw['paymentMethod'] ?? '—'),
      receiptNumber: String(raw['receiptNumber'] ?? raw['receiptUrl'] ?? ''),
    };
  }

  private normalizeStatus(raw: string): PaymentStatusVm {
    const s = raw.toUpperCase();
    if (s === 'PAID' || s === 'COMPLETED' || s === 'COMPLETADO') return 'completado';
    if (s === 'OVERDUE' || s === 'VENCIDO') return 'vencido';
    if (s === 'UPCOMING' || s === 'PROXIMO' || s === 'SCHEDULED') return 'proximo';
    return 'pendiente';
  }
}
