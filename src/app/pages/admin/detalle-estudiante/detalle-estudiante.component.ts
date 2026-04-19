import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, StudentPaymentItem, RegisterStudentPaymentDto } from '../../../services/admin.service';

@Component({
  selector: 'app-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  templateUrl: './detalle-estudiante.component.html',
  styleUrl: './detalle-estudiante.component.css'
})
export class DetalleEstudianteComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  activeTab = signal('perfil');
  studentId = '';

  student = signal<any>(null);
  academicHistory = signal<unknown[]>([]);
  grades = signal<unknown[]>([]);
  attendance = signal<unknown[]>([]);
  parents = signal<unknown[]>([]);
  documents = signal<unknown[]>([]);
  studentPayments = signal<StudentPaymentItem[]>([]);
  paymentsLoading = signal(false);
  paymentError = signal('');
  paymentSuccess = signal('');
  paymentForm = signal({
    concept: '',
    amount: '',
    dueDate: '',
    paidAt: '',
    paymentMethod: '',
    reference: '',
    notes: '',
    status: 'PAID',
    category: 'matricula'
  });

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit() {
    this.studentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadStudent();
  }

  loadStudent() {
    this.loading.set(true);
    this.adminService.getStudent(this.studentId).subscribe({
      next: (data) => { this.student.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el estudiante'); this.loading.set(false); }
    });
  }

  selectTab(tab: string) {
    this.activeTab.set(tab);
    switch (tab) {
      case 'academico': this.loadAcademicHistory(); break;
      case 'notas': this.loadGrades(); break;
      case 'asistencia': this.loadAttendance(); break;
      case 'padres': this.loadParents(); break;
      case 'documentos': this.loadDocuments(); break;
      case 'matricula': this.loadStudentPayments(); break;
    }
  }

  loadAcademicHistory() {
    this.adminService.getStudentAcademicHistory(this.studentId).subscribe({
      next: (data) => this.academicHistory.set(data)
    });
  }

  loadGrades() {
    this.adminService.getStudentGrades(this.studentId).subscribe({
      next: (data) => this.grades.set(data)
    });
  }

  loadAttendance() {
    this.adminService.getStudentAttendance(this.studentId).subscribe({
      next: (data) => this.attendance.set(data)
    });
  }

  loadParents() {
    this.adminService.getStudentParents(this.studentId).subscribe({
      next: (data) => this.parents.set(data)
    });
  }

  loadDocuments() {
    this.adminService.getStudentDocuments(this.studentId).subscribe({
      next: (data) => this.documents.set(data)
    });
  }

  loadStudentPayments() {
    this.paymentError.set('');
    this.paymentsLoading.set(true);
    this.adminService.getStudentPayments(this.studentId).subscribe({
      next: (data) => {
        this.studentPayments.set(data);
        this.paymentsLoading.set(false);
      },
      error: () => {
        this.paymentError.set('No se pudieron cargar los pagos del estudiante');
        this.studentPayments.set([]);
        this.paymentsLoading.set(false);
      }
    });
  }

  unlinkParent(parentId: string) {
    this.adminService.unlinkParent(this.studentId, parentId).subscribe({
      next: () => this.loadParents()
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    this.adminService.uploadStudentDocuments(this.studentId, files).subscribe({
      next: () => this.loadDocuments()
    });
  }

  deleteDocument(docId: string) {
    this.adminService.deleteStudentDocument(this.studentId, docId).subscribe({
      next: () => this.loadDocuments()
    });
  }

  downloadDocument(docId: string) {
    window.open(this.adminService.getDocumentDownloadUrl(this.studentId, docId));
  }

  setTab(tab: string) { this.selectTab(tab); }
  getFullName(): string {
    const s = this.student();
    if (!s) return '';
    return s.name ?? `${s.user.firstName} ${s.user.lastName}`;
  }

  attendanceStats = computed(() => {
    const list = this.attendance() as any[];
    const present = list.filter(r => r.status === 'PRESENT').length;
    const absent = list.filter(r => r.status === 'ABSENT').length;
    const late = list.filter(r => r.status === 'LATE').length;
    const total = list.length;
    return { present, absent, late, total, percentage: total > 0 ? Math.round(present / total * 100) : 0 };
  });
  getCurrentEnrollment() { return this.student()?.enrollments?.[0]; }
  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'badge-success', INACTIVE: 'badge-secondary', SUSPENDED: 'badge-danger' };
    return map[status] ?? 'badge-secondary';
  }
  getStatusLabel(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', SUSPENDED: 'Suspendido' };
    return map[status] ?? status;
  }
  getRelationshipLabel(rel: string): string { return rel ?? 'Apoderado'; }
  getCategoryIcon(_cat: string): string { return 'fas fa-file'; }
  getCategoryLabel(cat: string): string { return cat ?? 'Documento'; }
  formatFileSize(size: number): string {
    if (!size) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1048576).toFixed(1)} MB`;
  }

  updatePaymentField(field: string, value: string) {
    this.paymentForm.update(d => ({ ...d, [field]: value }));
  }

  registerPayment() {
    this.paymentError.set('');
    this.paymentSuccess.set('');
    const f = this.paymentForm();
    const amount = Number(f.amount);
    if (!f.concept.trim()) {
      this.paymentError.set('El concepto del pago es obligatorio');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      this.paymentError.set('El monto debe ser mayor a 0');
      return;
    }

    const dto: RegisterStudentPaymentDto = {
      concept: f.concept.trim(),
      amount,
      dueDate: f.dueDate || undefined,
      paidAt: f.paidAt || undefined,
      paymentMethod: f.paymentMethod || undefined,
      reference: f.reference || undefined,
      notes: f.notes || undefined,
      status: f.status || undefined,
      category: f.category || undefined
    };

    this.paymentsLoading.set(true);
    this.adminService.registerStudentPayment(this.studentId, dto).subscribe({
      next: () => {
        this.paymentSuccess.set('Pago registrado correctamente');
        this.paymentForm.set({
          concept: '',
          amount: '',
          dueDate: '',
          paidAt: '',
          paymentMethod: '',
          reference: '',
          notes: '',
          status: 'PAID',
          category: 'matricula'
        });
        this.loadStudentPayments();
      },
      error: (err) => {
        if (err?.status === 404) {
          this.paymentError.set('El backend aún no tiene habilitado el registro directo de pagos para estudiantes.');
        } else {
          this.paymentError.set(err?.error?.error?.message ?? 'No se pudo registrar el pago');
        }
        this.paymentsLoading.set(false);
      }
    });
  }

  get totalPaidAmount(): number {
    return this.studentPayments()
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get totalPendingAmount(): number {
    return this.studentPayments()
      .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get paidCount(): number {
    return this.studentPayments().filter(p => p.status === 'PAID').length;
  }

  get pendingCount(): number {
    return this.studentPayments().filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').length;
  }

  getEnrollmentStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      ACTIVE: 'Matriculado',
      WITHDRAWN: 'Retirado',
      TRANSFERRED: 'Trasladado',
      COMPLETED: 'Completado'
    };
    return map[status ?? ''] ?? (status || 'Sin matrícula');
  }

  getPaymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      PAID: 'badge-success',
      PENDING: 'badge-warning',
      OVERDUE: 'badge-error',
      CANCELLED: 'badge-secondary'
    };
    return map[status] ?? 'badge-secondary';
  }

  getPaymentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      OVERDUE: 'Vencido',
      CANCELLED: 'Cancelado'
    };
    return map[status] ?? status;
  }

  // Modal de subir documento
  showUploadModal = signal(false);
  documentCategory = signal('');
  documentName = signal('');
  selectedFile = signal<File | null>(null);
  isUploading = signal(false);

  openUploadModal() { this.showUploadModal.set(true); }
  closeUploadModal() { this.showUploadModal.set(false); }
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  // Modal de asignar padre
  showAssignParentModal = signal(false);
  selectedParentId = signal('');
  selectedParent = signal<unknown>(null);
  availableParentsForAssignment = signal<unknown[]>([]);

  openAssignParentModal() {
    this.showAssignParentModal.set(true);
    this.adminService.getParents({ pageSize: 100 }).subscribe({ next: ({ data }) => this.availableParentsForAssignment.set(data) });
  }
  closeAssignParentModal() { this.showAssignParentModal.set(false); }
  assignParent() {
    const parentId = this.selectedParentId();
    if (!parentId) return;
    this.adminService.linkParent(this.studentId, parentId).subscribe({ next: () => { this.closeAssignParentModal(); this.loadParents(); } });
  }
  removeParent(parentId: string) { this.unlinkParent(parentId); }
}
