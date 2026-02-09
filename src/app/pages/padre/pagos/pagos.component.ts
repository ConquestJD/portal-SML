import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Child {
  id: string;
  name: string;
  grade: string;
  section: string;
  photo?: string;
}

interface Payment {
  id: string;
  childId: string;
  concept: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pendiente' | 'proximo' | 'completado' | 'vencido';
  paymentDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  category: 'matricula' | 'mensualidad' | 'materiales' | 'actividades' | 'otros';
}

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css'
})
export class PagosComponent implements OnInit {
  selectedChildId = signal<string>('');
  filterStatus = signal<'todos' | 'pendiente' | 'proximo' | 'completado' | 'vencido'>('todos');
  filterCategory = signal<'todos' | Payment['category']>('todos');
  searchQuery = signal('');
  isLoading = signal(true);
  
  children = signal<Child[]>([
    { 
      id: '1', 
      name: 'María Rodríguez', 
      grade: '3ro', 
      section: 'A'
    },
    { 
      id: '2', 
      name: 'Pedro Rodríguez', 
      grade: '1ro', 
      section: 'B'
    }
  ]);

  allPayments = signal<Payment[]>([]);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer query params si existe childId
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      } else if (this.children().length > 0) {
        this.selectedChildId.set(this.children()[0].id);
      }
    });

    this.loadPayments();
  }

  loadPayments() {
    this.isLoading.set(true);
    
    setTimeout(() => {
      // Pagos para María (3ro A)
      const mariaPayments: Payment[] = [
        {
          id: 'p1',
          childId: '1',
          concept: 'Matrícula 2024',
          description: 'Matrícula del año académico 2024',
          amount: 500.00,
          dueDate: '2024-03-01',
          status: 'completado',
          paymentDate: '2024-02-28',
          paymentMethod: 'Transferencia',
          receiptNumber: 'REC-2024-001',
          category: 'matricula'
        },
        {
          id: 'p2',
          childId: '1',
          concept: 'Mensualidad Marzo',
          description: 'Mensualidad correspondiente al mes de marzo',
          amount: 250.00,
          dueDate: '2024-03-05',
          status: 'completado',
          paymentDate: '2024-03-03',
          paymentMethod: 'Efectivo',
          receiptNumber: 'REC-2024-015',
          category: 'mensualidad'
        },
        {
          id: 'p3',
          childId: '1',
          concept: 'Mensualidad Abril',
          description: 'Mensualidad correspondiente al mes de abril',
          amount: 250.00,
          dueDate: '2024-04-05',
          status: 'pendiente',
          category: 'mensualidad'
        },
        {
          id: 'p4',
          childId: '1',
          concept: 'Materiales Escolares',
          description: 'Materiales y útiles escolares del primer trimestre',
          amount: 150.00,
          dueDate: '2024-04-15',
          status: 'proximo',
          category: 'materiales'
        },
        {
          id: 'p5',
          childId: '1',
          concept: 'Mensualidad Mayo',
          description: 'Mensualidad correspondiente al mes de mayo',
          amount: 250.00,
          dueDate: '2024-05-05',
          status: 'proximo',
          category: 'mensualidad'
        },
        {
          id: 'p6',
          childId: '1',
          concept: 'Actividad Deportiva',
          description: 'Inscripción en actividad deportiva extraescolar',
          amount: 80.00,
          dueDate: '2024-03-20',
          status: 'vencido',
          category: 'actividades'
        }
      ];

      // Pagos para Pedro (1ro B)
      const pedroPayments: Payment[] = [
        {
          id: 'p7',
          childId: '2',
          concept: 'Matrícula 2024',
          description: 'Matrícula del año académico 2024',
          amount: 500.00,
          dueDate: '2024-03-01',
          status: 'completado',
          paymentDate: '2024-02-25',
          paymentMethod: 'Transferencia',
          receiptNumber: 'REC-2024-002',
          category: 'matricula'
        },
        {
          id: 'p8',
          childId: '2',
          concept: 'Mensualidad Marzo',
          description: 'Mensualidad correspondiente al mes de marzo',
          amount: 250.00,
          dueDate: '2024-03-05',
          status: 'completado',
          paymentDate: '2024-03-04',
          paymentMethod: 'Tarjeta',
          receiptNumber: 'REC-2024-020',
          category: 'mensualidad'
        },
        {
          id: 'p9',
          childId: '2',
          concept: 'Mensualidad Abril',
          description: 'Mensualidad correspondiente al mes de abril',
          amount: 250.00,
          dueDate: '2024-04-05',
          status: 'pendiente',
          category: 'mensualidad'
        },
        {
          id: 'p10',
          childId: '2',
          concept: 'Materiales Escolares',
          description: 'Materiales y útiles escolares del primer trimestre',
          amount: 120.00,
          dueDate: '2024-04-20',
          status: 'proximo',
          category: 'materiales'
        }
      ];

      this.allPayments.set([...mariaPayments, ...pedroPayments]);
      this.isLoading.set(false);
    }, 500);
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
  }

  selectedChild = computed(() => {
    return this.children().find(c => c.id === this.selectedChildId());
  });

  payments = computed(() => {
    return this.allPayments().filter(p => p.childId === this.selectedChildId());
  });

  filteredPayments = computed(() => {
    let result = this.payments();
    const status = this.filterStatus();
    const category = this.filterCategory();
    const query = this.searchQuery().toLowerCase();

    if (status !== 'todos') {
      result = result.filter(p => p.status === status);
    }

    if (category !== 'todos') {
      result = result.filter(p => p.category === category);
    }

    if (query) {
      result = result.filter(p => 
        p.concept.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      );
    }

    return result;
  });

  summary = computed(() => {
    const childPayments = this.payments();
    return {
      total: childPayments.reduce((sum, p) => sum + p.amount, 0),
      completado: childPayments
        .filter(p => p.status === 'completado')
        .reduce((sum, p) => sum + p.amount, 0),
      pendiente: childPayments
        .filter(p => p.status === 'pendiente')
        .reduce((sum, p) => sum + p.amount, 0),
      proximo: childPayments
        .filter(p => p.status === 'proximo')
        .reduce((sum, p) => sum + p.amount, 0),
      vencido: childPayments
        .filter(p => p.status === 'vencido')
        .reduce((sum, p) => sum + p.amount, 0),
      completadosCount: childPayments.filter(p => p.status === 'completado').length,
      pendientesCount: childPayments.filter(p => p.status === 'pendiente').length,
      proximosCount: childPayments.filter(p => p.status === 'proximo').length,
      vencidosCount: childPayments.filter(p => p.status === 'vencido').length
    };
  });

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  getCategoryLabel(category: Payment['category']): string {
    const labels: Record<Payment['category'], string> = {
      matricula: 'Matrícula',
      mensualidad: 'Mensualidad',
      materiales: 'Materiales',
      actividades: 'Actividades',
      otros: 'Otros'
    };
    return labels[category];
  }

  getCategoryIcon(category: Payment['category']): string {
    const icons: Record<Payment['category'], string> = {
      matricula: 'fa-graduation-cap',
      mensualidad: 'fa-calendar-alt',
      materiales: 'fa-book',
      actividades: 'fa-running',
      otros: 'fa-file-invoice-dollar'
    };
    return icons[category];
  }

  downloadReceipt(payment: Payment) {
    console.log('Descargar recibo:', payment.receiptNumber);
    // En producción, esto descargaría el recibo PDF
  }
}
