import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, StudentPaymentItem, RegisterStudentPaymentDto } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

@Component({
  selector: 'app-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule, ...ADMIN_SHARED],
  templateUrl: './detalle-estudiante.component.html',
  styleUrl: './detalle-estudiante.component.css'
})
export class DetalleEstudianteComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  activeTab = signal('perfil');
  studentId = '';

  readonly tabs: AdminTab[] = [
    { id: 'perfil',     label: 'Perfil',             icon: 'fa-user' },
    { id: 'academico',  label: 'Académico',          icon: 'fa-graduation-cap' },
    { id: 'notas',      label: 'Notas',              icon: 'fa-chart-line' },
    { id: 'asistencia', label: 'Asistencia',         icon: 'fa-calendar-check' },
    { id: 'padres',     label: 'Padres de familia',  icon: 'fa-users' },
    { id: 'matricula',  label: 'Matrícula y pagos',  icon: 'fa-file-invoice-dollar' },
    { id: 'documentos', label: 'Documentos',         icon: 'fa-file' },
  ];

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
    this.loadParents();
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
      next: (data) => this.parents.set(this.normalizeParents(data as any[]))
    });
  }

  /** Acepta tanto Parent planos como relaciones { parent: {...}, isPrimary, relationship }. */
  private normalizeParents(raw: any[]): any[] {
    return (raw ?? []).map(r => {
      const p = r?.parent ?? r;
      const u = p?.user ?? r?.user ?? {};
      const fallbackName = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || '(sin nombre)';
      const rawStatus = p?.status ?? u?.status ?? '';
      return {
        id: p?.id ?? r?.parentId ?? r?.id ?? '',
        name: p?.name ?? r?.name ?? fallbackName,
        email: p?.email ?? u?.email ?? '',
        phone: p?.phone ?? u?.phone ?? '',
        dni: p?.dni ?? u?.dni ?? '',
        address: p?.address ?? u?.address ?? '',
        relationship: r?.relationship ?? p?.relationship ?? 'Apoderado',
        occupation: p?.occupation ?? '',
        isPrimary: !!(r?.isPrimary ?? p?.isPrimary),
        isActive: r?.isActive ?? p?.isActive ?? rawStatus === 'ACTIVE',
        status: rawStatus,
      };
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
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  uploadDocument() {
    const file = this.selectedFile();
    if (!file) return;
    this.isUploading.set(true);
    this.adminService.uploadStudentDocuments(this.studentId, [file]).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.closeUploadModal();
        this.selectedFile.set(null);
        this.loadDocuments();
      },
      error: () => this.isUploading.set(false),
    });
  }

  deleteDocument(docId: string) {
    this.adminService.deleteStudentDocument(this.studentId, docId).subscribe({
      next: () => this.loadDocuments()
    });
  }

  downloadDocument(doc: { id: string } | string) {
    const docId = typeof doc === 'string' ? doc : doc.id;
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
  closeUploadModal() { this.showUploadModal.set(false); this.selectedFile.set(null); }

  // Modal de asignar padre
  showAssignParentModal = signal(false);
  private _selectedParentId = signal('');
  get selectedParentId(): string { return this._selectedParentId(); }
  set selectedParentId(v: string) { this._selectedParentId.set(v); }

  private allAvailableParents = signal<any[]>([]);

  /** Padres disponibles excluyendo a los ya vinculados al estudiante. */
  availableParentsForAssignment = computed(() => {
    const linkedIds = new Set((this.parents() as any[]).map(p => p.id));
    return this.allAvailableParents().filter(p => !linkedIds.has(p.id));
  });

  /** Padre actualmente seleccionado en el modal. */
  selectedParent = computed(() =>
    this.availableParentsForAssignment().find(p => p.id === this._selectedParentId()) ?? null
  );

  openAssignParentModal() {
    this.showAssignParentModal.set(true);
    this._selectedParentId.set('');
    this.adminService.getParents({ pageSize: 100 }).subscribe({
      next: ({ data }) => this.allAvailableParents.set(data as any[]),
    });
  }
  closeAssignParentModal() {
    this.showAssignParentModal.set(false);
    this._selectedParentId.set('');
  }
  assignParent() {
    const parentId = this._selectedParentId();
    if (!parentId) return;
    this.adminService.linkParent(this.studentId, parentId).subscribe({
      next: () => { this.closeAssignParentModal(); this.loadParents(); }
    });
  }
  removeParent(parentId: string) { this.unlinkParent(parentId); }
}
