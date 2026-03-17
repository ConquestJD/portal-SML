import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child, ParentPayment } from '../../../services/parent.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css'
})
export class PagosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  readonly isLoading = this.loading;
  selectedChildId = signal('');
  filterStatus = signal('');
  filterCategory = signal('');
  searchQuery = signal('');
  children = signal<Child[]>([]);
  payments = signal<ParentPayment[]>([]);

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.loadPayments(data[0].id); }
        this.loading.set(false);
      }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.loadPayments(id); }

  loadPayments(childId: string) {
    this.parentService.getPayments(childId, {
      status: this.filterStatus() || undefined,
      category: this.filterCategory() || undefined,
      search: this.searchQuery() || undefined
    }).subscribe({ next: (data) => this.payments.set(data) });
  }

  downloadReceipt(paymentId: string) {
    const childId = this.selectedChildId();
    if (childId) window.open(this.parentService.getReceiptUrl(childId, paymentId));
  }

  getTotalPending(): number {
    return this.payments()
      .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((acc, p) => acc + p.amount, 0);
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }
}
