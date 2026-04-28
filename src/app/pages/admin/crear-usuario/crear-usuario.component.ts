import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AdminService, UserItem } from '../../../services/admin.service';
import {
  USER_FORM_STRATEGIES, UserFormStrategy, UserFormData, emptyFormData, FieldKey, usernameFromDni,
} from './user-form.strategies';
import { RoleKind, apiRoleToKind } from '../_shared/models/role.model';
import { AdminBreadcrumbComponent } from '../_shared/components/breadcrumb/admin-breadcrumb.component';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminBreadcrumbComponent],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css',
})
export class CrearUsuarioComponent implements OnInit {
  readonly MIN_PASSWORD_LENGTH = 8;
  /** DNI peruano; el nombre de usuario de acceso son solo estos dígitos. */
  readonly MIN_DNI_DIGITS = 8;

  readonly GRADES: Record<string, string[]> = {
    inicial:    ['3 años', '4 años', '5 años'],
    primaria:   ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'],
    secundaria: ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'],
  };

  readonly DEPARTMENTS = [
    'Matemática', 'Lengua y Literatura', 'Ciencias', 'Historia', 'Inglés',
    'Educación Física', 'Arte', 'Música',
  ];

  readonly RELATIONSHIPS = ['Padre', 'Madre', 'Tutor', 'Abuelo', 'Abuela', 'Tío', 'Tía', 'Apoderado'];

  isEditMode = signal(false);
  userId = signal('');
  isLoading = signal(false);
  error = signal('');
  success = signal('');

  /** Rol actual (resuelto desde la ruta o desde el `tipo` query param legacy). */
  roleKind = signal<RoleKind>('admin');
  strategy = computed<UserFormStrategy>(() => USER_FORM_STRATEGIES[this.roleKind()]);

  /** Clase CSS para tema visual por tipo de usuario (estudiante, docente, apoderado, admin). */
  containerRoleClass = computed(() => `crear-usuario-container--${this.roleKind()}`);

  formData = signal<UserFormData>(emptyFormData());

  availableGrades = computed(() => this.GRADES[this.formData().level] ?? []);

  pageTitle = computed(() =>
    this.isEditMode() ? `Editar ${this.strategy().singular}` : `Nuevo ${this.strategy().singular}`
  );
  pageSubtitle = computed(() =>
    this.isEditMode() ? 'Modifica los datos del usuario' : this.strategy().subtitle
  );

  breadcrumbItems = computed(() => [
    { label: this.strategy().listLabel, link: this.strategy().listPath },
    { label: this.pageTitle() },
  ]);

  credentialsRequired = computed(() =>
    this.strategy().requiresCredentials(this.formData(), this.isEditMode())
  );

  /** En "inicial" no se piden credenciales porque se crean más adelante. */
  showInitialNote = computed(() =>
    this.roleKind() === 'student' && this.formData().level === 'inicial' && !this.isEditMode()
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
  ) {}

  ngOnInit() {
    this.route.data.subscribe(data => {
      const fromData = data['roleKind'] as RoleKind | undefined;
      if (fromData) this.roleKind.set(fromData);
    });

    this.route.queryParams.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'estudiante') this.roleKind.set('student');
      else if (tipo === 'profesor') this.roleKind.set('teacher');
      else if (tipo === 'padre') this.roleKind.set('parent');
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.userId.set(params['id']);
        this.loadUserData(params['id']);
      }
    });
  }

  private loadUserData(id: string) {
    const stateUser: UserItem | undefined = history.state?.user;
    if (stateUser && stateUser.id === id) {
      this.populateFormFromUser(stateUser);
      const kind = apiRoleToKind(stateUser.role?.name);
      if (kind) this.roleKind.set(kind);

      if (kind === 'student') {
        this.adminService.getStudentById(id).subscribe({
          next: (student) => {
            this.formData.update(d => ({
              ...d,
              studentCode:  student.studentCode ?? student.code ?? '',
              birthDate:    student.birthDate ?? '',
              gender:       student.gender ?? '',
              address:      student.address ?? '',
              bloodType:    student.bloodType ?? '',
              medicalNotes: student.medicalNotes ?? '',
              grade:        student.grade ?? '',
              level:        (student.level ?? '').toLowerCase(),
              dni:          student.dni ?? d.dni ?? '',
            }));
          },
        });
      }
    }
  }

  private populateFormFromUser(user: UserItem) {
    this.formData.update(d => ({
      ...d,
      firstName: user.firstName ?? '',
      lastName:  user.lastName ?? '',
      username:  user.username ?? '',
      email:     user.email ?? '',
      phone:     user.phone ?? '',
      status:    (user.status as UserFormData['status']) ?? 'ACTIVE',
      dni:       user.dni ?? usernameFromDni(user.username ?? ''),
    }));
  }

  hasField(key: FieldKey): boolean {
    return this.strategy().roleFields.includes(key);
  }

  update<K extends keyof UserFormData>(field: K, value: UserFormData[K]) {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  updateRaw(field: string, value: unknown) {
    this.formData.update(d => ({ ...d, [field]: value as never }));
  }

  onLevelChange(level: string) {
    this.formData.update(d => ({ ...d, level, grade: '' }));
  }

  /** Sincroniza DNI ↔ nombre de usuario (solo dígitos) en alta. */
  onDniInput(value: string) {
    this.formData.update(d => ({ ...d, dni: value }));
    if (!this.isEditMode()) {
      const u = usernameFromDni(value);
      this.formData.update(d => ({ ...d, username: u }));
    }
  }

  dniError(): string {
    if (this.isEditMode() || !this.hasField('dni')) return '';
    const digits = usernameFromDni(this.formData().dni);
    if (!digits) return 'El DNI es obligatorio';
    if (digits.length < this.MIN_DNI_DIGITS) {
      return `El DNI debe tener al menos ${this.MIN_DNI_DIGITS} dígitos`;
    }
    return '';
  }

  resetPassword() {
    if (!this.userId()) return;
    this.adminService.resetUserPassword(this.userId()).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');
    const d = this.formData();

    // DNI obligatorio en creación y base del usuario de acceso
    if (!this.isEditMode()) {
      const dErr = this.dniError();
      if (dErr) {
        this.error.set(dErr);
        this.isLoading.set(false);
        return;
      }
    }

    const mustValidatePassword = this.credentialsRequired() && (!this.isEditMode() || !!d.password);
    if (mustValidatePassword && d.password.length < this.MIN_PASSWORD_LENGTH) {
      this.error.set(`La contraseña debe tener al menos ${this.MIN_PASSWORD_LENGTH} caracteres`);
      this.isLoading.set(false);
      return;
    }

    if (this.isEditMode()) {
      this.doUpdate(d);
      return;
    }
    this.doCreate(d);
  }

  private doCreate(d: UserFormData) {
    const strategy = this.strategy();
    const dto = strategy.buildCreateDto(d);
    strategy.create(this.adminService, dto).subscribe({
      next: () => {
        this.success.set(strategy.successMessage);
        this.isLoading.set(false);
        this.router.navigate([strategy.listPath]);
      },
      error: (err) => {
        this.error.set(this.parseError(err) ?? `Error al crear ${strategy.singular.toLowerCase()}`);
        this.isLoading.set(false);
      },
    });
  }

  private doUpdate(d: UserFormData) {
    const dto: Record<string, unknown> = {
      firstName: d.firstName,
      lastName:  d.lastName,
      phone:     d.phone || undefined,
    };
    if (d.password) dto['password'] = d.password;
    if (this.roleKind() === 'student') {
      dto['grade'] = d.grade || undefined;
      dto['level'] = d.level || undefined;
    }

    this.adminService.updateUser(this.userId(), dto as never).subscribe({
      next: () => {
        this.success.set('Usuario actualizado correctamente');
        this.isLoading.set(false);
        this.router.navigate([this.strategy().listPath]);
      },
      error: (err) => {
        this.error.set(this.parseError(err) ?? 'Error al actualizar usuario');
        this.isLoading.set(false);
      },
    });
  }

  private parseError(err: unknown): string | null {
    const anyErr = err as { error?: { error?: { message?: string | string[] } } };
    const msg = anyErr?.error?.error?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg ?? null;
  }
}
