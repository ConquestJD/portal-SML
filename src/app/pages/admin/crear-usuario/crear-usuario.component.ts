import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AdminService, UserItem } from '../../../services/admin.service';
import {
  USER_FORM_STRATEGIES, UserFormStrategy, UserFormData, emptyFormData, FieldKey, usernameFromDni,
  studentAccessCodeExample,
} from './user-form.strategies';
import { RoleKind, apiRoleToKind } from '../_shared/models/role.model';
import { AdminBreadcrumbComponent } from '../_shared/components/breadcrumb/admin-breadcrumb.component';
import { HERO } from '../../../shared/utils/hero-image';

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
  /** Id de `User` ligado al profesor (para reset/cambio de contraseña en edición). */
  linkedUserId = signal('');
  isLoading = signal(false);
  error = signal('');
  success = signal('');

  /** Rol actual (resuelto desde la ruta o desde el `tipo` query param legacy). */
  roleKind = signal<RoleKind>('admin');
  strategy = computed<UserFormStrategy>(() => USER_FORM_STRATEGIES[this.roleKind()]);

  /** Clase CSS por rol (look unificado SML; se conserva para trazabilidad). */
  containerRoleClass = computed(() => `crear-usuario-container--${this.roleKind()}`);

  formData = signal<UserFormData>(emptyFormData());

  availableGrades = computed(() => this.GRADES[this.formData().level] ?? []);

  pageTitle = computed(() =>
    this.isEditMode() ? `Editar ${this.strategy().singular}` : `Nuevo ${this.strategy().singular}`
  );
  /** En alta no mostramos subtítulo; en edición un línea corta. */
  pageSubtitle = computed(() =>
    this.isEditMode() ? 'Actualiza solo lo necesario' : ''
  );

  breadcrumbItems = computed(() => [
    { label: this.strategy().listLabel, link: this.strategy().listPath },
    { label: this.pageTitle() },
  ]);

  credentialsRequired = computed(() =>
    this.strategy().requiresCredentials(this.formData(), this.isEditMode())
  );

  /** En "inicial" el acceso también es automático (código + DNI). */
  showInitialNote = computed(() =>
    this.roleKind() === 'student' && this.formData().level === 'inicial' && !this.isEditMode()
  );

  showAccessSection = computed(() =>
    this.isEditMode() || this.credentialsRequired() || this.roleKind() === 'student'
  );

  /** Código de acceso que asignará el backend al crear un alumno (s + año + correlativo). */
  studentCodePreview = computed(() => studentAccessCodeExample());

  studentPasswordPreview = computed(() => usernameFromDni(this.formData().dni));

  isStudentForm = computed(() => this.roleKind() === 'student');
  isTeacherForm = computed(() => this.roleKind() === 'teacher');
  isParentForm = computed(() => this.roleKind() === 'parent');
  isAdminForm = computed(() => this.roleKind() === 'admin');

  heroSrc = computed(() => {
    switch (this.roleKind()) {
      case 'teacher': return HERO.teachers;
      case 'parent': return HERO.parents;
      case 'admin': return HERO.admin;
      default: return HERO.students;
    }
  });

  asideFullName = computed(() => {
    const d = this.formData();
    return `${d.firstName} ${d.lastName}`.trim();
  });

  asideInitials = computed(() => {
    const name = this.asideFullName();
    if (!name) return 'SML';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  });

  showOptional = signal(false);

  optionalFilledCount = computed(() => {
    const d = this.formData();
    if (this.roleKind() === 'teacher') {
      return [d.phone, d.specialty, d.teacherCode, d.bio]
        .filter(v => !!String(v ?? '').trim()).length;
    }
    if (this.roleKind() === 'parent') {
      return [d.phone, d.relationship, d.occupation]
        .filter(v => !!String(v ?? '').trim()).length;
    }
    if (this.roleKind() === 'admin') {
      return [d.phone, d.address]
        .filter(v => !!String(v ?? '').trim()).length;
    }
    return [d.email, d.phone, d.emergencyPhone, d.address, d.birthDate, d.gender]
      .filter(v => !!String(v ?? '').trim()).length;
  });

  studentReadyCount = computed(() => {
    const d = this.formData();
    let n = 0;
    if (usernameFromDni(d.dni).length >= this.MIN_DNI_DIGITS) n++;
    if (d.firstName.trim()) n++;
    if (d.lastName.trim()) n++;
    if (d.level) n++;
    if (d.grade) n++;
    return n;
  });

  teacherReadyCount = computed(() => {
    const d = this.formData();
    let n = 0;
    if (usernameFromDni(d.dni).length >= this.MIN_DNI_DIGITS) n++;
    if (d.firstName.trim()) n++;
    if (d.lastName.trim()) n++;
    if (this.emailReady()) n++;
    return n;
  });

  credentialReadyCount = computed(() => {
    const d = this.formData();
    let n = 0;
    if (usernameFromDni(d.dni).length >= this.MIN_DNI_DIGITS) n++;
    if (d.firstName.trim()) n++;
    if (d.lastName.trim()) n++;
    if (this.emailReady()) n++;
    return n;
  });

  dniReady = computed(() => usernameFromDni(this.formData().dni).length >= this.MIN_DNI_DIGITS);

  emailReady = computed(() => this.isValidEmail(this.formData().email));

  toggleOptional() {
    this.showOptional.update(v => !v);
  }

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
        this.showOptional.set(true);
        this.userId.set(params['id']);
        this.loadUserData(params['id']);
      }
    });
  }

  private loadUserData(id: string) {
    const kindFromRoute = this.route.snapshot.data['roleKind'] as RoleKind | undefined;
    if (kindFromRoute) this.roleKind.set(kindFromRoute);

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

    if (this.roleKind() === 'teacher') {
      this.adminService.getTeacher(id).subscribe({
        next: (teacher) => {
          this.linkedUserId.set(teacher.user?.id ?? '');
          this.formData.update(d => ({
            ...d,
            firstName:   teacher.user?.firstName ?? d.firstName,
            lastName:    teacher.user?.lastName ?? d.lastName,
            username:    teacher.username ?? teacher.user?.username ?? d.username,
            email:       teacher.email ?? teacher.user?.email ?? d.email,
            phone:       teacher.phone ?? teacher.user?.phone ?? d.phone,
            dni:         /^\d{8,}$/.test(teacher.dni ?? '') ? teacher.dni! : d.dni,
            status:      ((teacher.status ?? teacher.user?.status) as UserFormData['status']) || d.status,
            specialty:   teacher.specialty ?? teacher.department ?? '',
            teacherCode: teacher.teacherCode ?? '',
            bio:         teacher.bio ?? '',
          }));
        },
      });
    }

    if (this.roleKind() === 'parent') {
      this.adminService.getParent(id).subscribe({
        next: (parent) => {
          this.linkedUserId.set(parent.user?.id ?? '');
          this.formData.update(d => ({
            ...d,
            firstName:     parent.user?.firstName ?? d.firstName,
            lastName:      parent.user?.lastName ?? d.lastName,
            username:      parent.username ?? parent.user?.username ?? d.username,
            email:         parent.email ?? parent.user?.email ?? d.email,
            phone:         parent.phone ?? parent.user?.phone ?? d.phone,
            dni:           /^\d{8,}$/.test(parent.dni ?? '') ? parent.dni! : d.dni,
            status:        ((parent.status ?? parent.user?.status) as UserFormData['status']) || d.status,
            relationship:  parent.relationship ?? '',
            occupation:    parent.occupation ?? '',
          }));
        },
      });
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
      dni: user.dni ?? (/^\d{8,}$/.test(user.username ?? '') ? usernameFromDni(user.username ?? '') : ''),
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

  /** Sincroniza DNI ↔ nombre de usuario (solo dígitos) en alta, excepto alumnos, profesores, padres y administradores. */
  onDniInput(value: string) {
    this.formData.update(d => ({ ...d, dni: value }));
    if (!this.isEditMode() && this.roleKind() !== 'student' && this.roleKind() !== 'teacher' && this.roleKind() !== 'parent' && this.roleKind() !== 'admin') {
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

  emailError(): string {
    if (this.isEditMode() || (this.roleKind() !== 'teacher' && this.roleKind() !== 'parent' && this.roleKind() !== 'admin')) return '';
    const email = this.formData().email.trim();
    if (!email) return 'El correo es obligatorio';
    if (!this.isValidEmail(email)) return 'Ingresa un correo válido';
    return '';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  resetPassword() {
    const id = this.linkedUserId() || this.userId();
    if (!id) return;
    this.adminService.resetUserPassword(id).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');
    const d = this.formData();

    if (!this.isEditMode()) {
      const dErr = this.dniError();
      if (dErr) {
        this.error.set(dErr);
        this.isLoading.set(false);
        return;
      }
    }

    if (this.roleKind() === 'student' && !this.isEditMode()) {
      if (!d.firstName.trim() || !d.lastName.trim()) {
        this.error.set('Nombre y apellido son obligatorios');
        this.isLoading.set(false);
        return;
      }
      if (!d.level || !d.grade) {
        this.error.set('Nivel y grado son obligatorios');
        this.isLoading.set(false);
        return;
      }
    }

    if (this.roleKind() === 'teacher' && !this.isEditMode()) {
      if (!d.firstName.trim() || !d.lastName.trim()) {
        this.error.set('Nombre y apellido son obligatorios');
        this.isLoading.set(false);
        return;
      }
      const mailErr = this.emailError();
      if (mailErr) {
        this.error.set(mailErr);
        this.isLoading.set(false);
        return;
      }
    }

    if ((this.roleKind() === 'parent' || this.roleKind() === 'admin') && !this.isEditMode()) {
      if (!d.firstName.trim() || !d.lastName.trim()) {
        this.error.set('Nombre y apellido son obligatorios');
        this.isLoading.set(false);
        return;
      }
      const mailErr = this.emailError();
      if (mailErr) {
        this.error.set(mailErr);
        this.isLoading.set(false);
        return;
      }
    }

    const mustValidatePassword =
      this.isEditMode()
        ? !!d.password
        : this.roleKind() !== 'student' && this.roleKind() !== 'teacher' && this.roleKind() !== 'parent' && this.roleKind() !== 'admin' && this.credentialsRequired();
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
      next: (created) => {
        const code = this.extractCreatedStudentCode(created);
        this.success.set(
          code
            ? `${strategy.successMessage}. Usuario: ${code} · Contraseña: DNI`
            : strategy.successMessage
        );
        this.isLoading.set(false);
        if (code) {
          const dni = usernameFromDni(d.dni);
          alert(`Estudiante creado.\nUsuario de acceso: ${code}\nContraseña: ${dni}`);
        } else if (this.roleKind() === 'teacher' || this.roleKind() === 'parent' || this.roleKind() === 'admin') {
          const dni = usernameFromDni(d.dni);
          const label = this.roleKind() === 'teacher' ? 'Profesor' : this.roleKind() === 'parent' ? 'Apoderado' : 'Administrador';
          alert(`${label} creado.\nUsuario de acceso: ${d.email.trim()}\nContraseña: ${dni}`);
        }
        this.router.navigate([strategy.listPath]);
      },
      error: (err) => {
        this.error.set(this.parseError(err) ?? `Error al crear ${strategy.singular.toLowerCase()}`);
        this.isLoading.set(false);
      },
    });
  }

  private extractCreatedStudentCode(created: unknown): string {
    if (this.roleKind() !== 'student' || !created || typeof created !== 'object') return '';
    const row = created as {
      studentCode?: string;
      code?: string;
      username?: string;
      user?: { username?: string };
    };
    return row.studentCode || row.code || row.user?.username || row.username || '';
  }

  private doUpdate(d: UserFormData) {
    if (this.roleKind() === 'parent') {
      this.adminService.updateParent(this.userId(), {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone || undefined,
        email: d.email || undefined,
        relationship: d.relationship || undefined,
        occupation: d.occupation || undefined,
      }).subscribe({
        next: () => {
          if (d.password && this.linkedUserId()) {
            this.adminService.updateUser(this.linkedUserId(), { password: d.password } as never).subscribe({
              next: () => this.finishUpdate(),
              error: (err) => {
                this.error.set(this.parseError(err) ?? 'Datos guardados, pero no se pudo cambiar la contraseña');
                this.isLoading.set(false);
              },
            });
            return;
          }
          this.finishUpdate();
        },
        error: (err) => {
          this.error.set(this.parseError(err) ?? 'Error al actualizar apoderado');
          this.isLoading.set(false);
        },
      });
      return;
    }

    if (this.roleKind() === 'teacher') {
      this.adminService.updateTeacher(this.userId(), {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone || undefined,
        email: d.email || undefined,
        specialty: d.specialty || undefined,
        bio: d.bio || undefined,
      }).subscribe({
        next: () => {
          if (d.password && this.linkedUserId()) {
            this.adminService.updateUser(this.linkedUserId(), { password: d.password } as never).subscribe({
              next: () => this.finishUpdate(),
              error: (err) => {
                this.error.set(this.parseError(err) ?? 'Datos guardados, pero no se pudo cambiar la contraseña');
                this.isLoading.set(false);
              },
            });
            return;
          }
          this.finishUpdate();
        },
        error: (err) => {
          this.error.set(this.parseError(err) ?? 'Error al actualizar profesor');
          this.isLoading.set(false);
        },
      });
      return;
    }

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
      next: () => this.finishUpdate(),
      error: (err) => {
        this.error.set(this.parseError(err) ?? 'Error al actualizar usuario');
        this.isLoading.set(false);
      },
    });
  }

  private finishUpdate() {
    this.success.set('Usuario actualizado correctamente');
    this.isLoading.set(false);
    this.router.navigate([this.strategy().listPath]);
  }

  private parseError(err: unknown): string | null {
    const anyErr = err as { error?: { error?: { message?: string | string[] } } };
    const msg = anyErr?.error?.error?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg ?? null;
  }
}
