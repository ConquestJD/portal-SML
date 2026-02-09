import { Component, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Child {
  id: string;
  name: string;
  grade: string;
  level: 'secundaria' | 'primaria' | 'inicial';
  status: 'activo' | 'inactivo';
  relationship: string;
  enrollmentDate: string;
}

interface Payment {
  id: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: 'pendiente' | 'pagado' | 'vencido';
  paymentDate?: string;
}

@Component({
  selector: 'app-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, NgClass],
  templateUrl: './detalle-padre.component.html',
  styleUrl: './detalle-padre.component.css'
})
export class DetallePadreComponent {
  padreId = signal('');
  activeTab = signal<'perfil' | 'hijos' | 'pagos'>('perfil');

  padre = signal({
    id: '1',
    name: 'María González',
    email: 'maria.gonzalez@email.com',
    username: 'padre_maria',
    dni: '12345678',
    phone: '+51 987654321',
    address: 'Av. Principal 123, Lima',
    status: 'activo',
    registrationDate: '2020-03-15'
  });

  children = signal<Child[]>([
    {
      id: '1',
      name: 'Juan González',
      grade: '3ro',
      level: 'secundaria',
      status: 'activo',
      relationship: 'Madre',
      enrollmentDate: '2020-03-15'
    },
    {
      id: '2',
      name: 'Ana González',
      grade: '5to',
      level: 'secundaria',
      status: 'activo',
      relationship: 'Madre',
      enrollmentDate: '2018-03-15'
    }
  ]);

  payments = signal<Payment[]>([
    {
      id: '1',
      concept: 'Matrícula 2024',
      amount: 500,
      dueDate: '2024-01-15',
      status: 'pagado',
      paymentDate: '2024-01-10'
    },
    {
      id: '2',
      concept: 'Mensualidad Marzo 2024',
      amount: 300,
      dueDate: '2024-03-05',
      status: 'pagado',
      paymentDate: '2024-03-01'
    },
    {
      id: '3',
      concept: 'Mensualidad Abril 2024',
      amount: 300,
      dueDate: '2024-04-05',
      status: 'pendiente'
    },
    {
      id: '4',
      concept: 'Mensualidad Mayo 2024',
      amount: 300,
      dueDate: '2024-05-05',
      status: 'pendiente'
    }
  ]);

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.padreId.set(params['id']);
      this.loadParentData(params['id']);
    });
  }

  loadParentData(id: string) {
    // Simular carga de datos según el ID
    setTimeout(() => {
      const parentsData: Record<string, any> = {
        '1': {
          id: '1',
          name: 'María González',
          email: 'maria.gonzalez@email.com',
          username: 'padre_maria',
          dni: '12345678',
          phone: '+51 987654321',
          address: 'Av. Principal 123, Lima',
          status: 'activo',
          registrationDate: '2020-03-15'
        },
        '2': {
          id: '2',
          name: 'Carlos Rodríguez',
          email: 'carlos.rodriguez@email.com',
          username: 'padre_carlos',
          dni: '23456789',
          phone: '+51 987654322',
          address: 'Jr. Los Olivos 456, San Isidro',
          status: 'activo',
          registrationDate: '2019-08-20'
        },
        '3': {
          id: '3',
          name: 'Ana Martínez',
          email: 'ana.martinez@email.com',
          username: 'padre_ana',
          dni: '34567890',
          phone: '+51 987654323',
          address: 'Av. Libertad 789, Miraflores',
          status: 'activo',
          registrationDate: '2021-01-10'
        }
      };

      const parentData = parentsData[id];
      if (parentData) {
        this.padre.set(parentData);
      }
    }, 300);
  }

  pendingPayments = computed(() => {
    return this.payments().filter(p => p.status === 'pendiente' || p.status === 'vencido');
  });

  paidPayments = computed(() => {
    return this.payments().filter(p => p.status === 'pagado');
  });

  totalPending = computed(() => {
    return this.pendingPayments().reduce((sum, p) => sum + p.amount, 0);
  });

  totalPaid = computed(() => {
    return this.paidPayments().reduce((sum, p) => sum + p.amount, 0);
  });

  setTab(tab: 'perfil' | 'hijos' | 'pagos') {
    this.activeTab.set(tab);
  }

  getPaymentStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pagado': 'badge-success',
      'pendiente': 'badge-warning',
      'vencido': 'badge-error'
    };
    return classes[status] || 'badge-secondary';
  }

  getPaymentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pagado': 'Pagado',
      'pendiente': 'Pendiente',
      'vencido': 'Vencido'
    };
    return labels[status] || status;
  }

  getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'secundaria': 'Secundaria',
      'primaria': 'Primaria',
      'inicial': 'Inicial'
    };
    return labels[level] || level;
  }
}
