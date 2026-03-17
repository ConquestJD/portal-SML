import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AdminService, UserItem } from '../../../services/admin.service';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css'
})
export class CrearUsuarioComponent implements OnInit {
  isEditMode = signal(false);
  userId = signal('');
  isStudentMode = signal(false);
  isProfessorMode = signal(false);
  isParentMode = signal(false);
  isLoading = signal(false);
  error = signal('');
  success = signal('');

  readonly GRADES: Record<string, string[]> = {
    inicial:    ['3 años', '4 años', '5 años'],
    primaria:   ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'],
    secundaria: ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria']
  };

  pageTitle    = computed(() => this.isEditMode() ? 'Editar Usuario' : 'Crear Usuario');
  pageSubtitle = computed(() => this.isEditMode() ? 'Modifica los datos' : 'Completa los datos del nuevo usuario');
  requiresCredentials = computed(() => !this.isEditMode());

  formData = signal({
    firstName: '', lastName: '', name: '',
    email: '', password: '', phone: '', username: '',
    role: 'STUDENT' as string, status: 'ACTIVE',
    // Student fields
    studentCode: '', birthDate: '', gender: '',
    address: '', bloodType: '', medicalNotes: '',
    level: '', grade: '',
    dni: '', emergencyPhone: '',
    // Teacher fields
    teacherCode: '', specialty: '', specialization: '',
    department: '', degree: '', university: '', bio: '',
    // Parent fields
    relationship: '', occupation: ''
  });

  availableGrades = computed(() => this.GRADES[this.formData().level] ?? []);

  onLevelChange(level: string) { this.formData.update(d => ({ ...d, level, grade: '' })); }
  onGradeChange(grade: string) { this.formData.update(d => ({ ...d, grade })); }

  resetPassword() { alert('Función de reset de contraseña'); }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'estudiante')   { this.isStudentMode.set(true);   this.formData.update(d => ({ ...d, role: 'STUDENT' })); }
      else if (tipo === 'profesor') { this.isProfessorMode.set(true); this.formData.update(d => ({ ...d, role: 'TEACHER' })); }
      else if (tipo === 'padre')    { this.isParentMode.set(true);    this.formData.update(d => ({ ...d, role: 'PARENT' })); }
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.userId.set(params['id']);
        this.loadUserData(params['id']);
      }
    });
  }

  loadUserData(id: string) {
    const stateUser: UserItem | undefined = history.state?.user;
    if (stateUser && stateUser.id === id) {
      this.populateFormFromUser(stateUser);
      const roleName = stateUser.role?.name;
      if (roleName === 'STUDENT') {
        this.isStudentMode.set(true);
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
              level:        student.level ?? '',
            }));
          }
        });
      } else if (roleName === 'TEACHER') {
        this.isProfessorMode.set(true);
      } else if (roleName === 'PARENT') {
        this.isParentMode.set(true);
      }
      return;
    }
    this.isLoading.set(false);
  }

  private populateFormFromUser(user: UserItem) {
    this.formData.update(d => ({
      ...d,
      firstName: user.firstName ?? '',
      lastName:  user.lastName ?? '',
      name:      user.name ?? `${user.firstName} ${user.lastName}`,
      email:     user.email ?? '',
      phone:     user.phone ?? '',
      status:    user.status ?? 'ACTIVE',
    }));
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    const d = this.formData();

    if (this.isEditMode()) {
      const dto: any = { firstName: d.firstName, lastName: d.lastName, phone: d.phone || undefined };
      if (d.password) dto.password = d.password;
      if (this.isStudentMode()) {
        dto.grade = d.grade || undefined;
        dto.level = d.level || undefined;
      }
      this.adminService.updateUser(this.userId(), dto).subscribe({
        next: () => {
          this.success.set('Usuario actualizado correctamente');
          this.isLoading.set(false);
          this.router.navigate(['/admin/usuarios']);
        },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al actualizar usuario'); this.isLoading.set(false); }
      });
      return;
    }

    if (this.isStudentMode()) {
      const dto = {
        email: d.email, password: d.password,
        firstName: d.firstName, lastName: d.lastName,
        phone: d.phone || undefined,
        studentCode: d.studentCode || undefined,
        birthDate:   d.birthDate   || undefined,
        gender:      d.gender      || undefined,
        address:     d.address     || undefined,
        bloodType:   d.bloodType   || undefined,
        medicalNotes: d.medicalNotes || undefined,
        grade: d.grade || undefined,
        level: d.level || undefined,
      };
      this.adminService.createStudent(dto).subscribe({
        next: () => {
          this.success.set('Estudiante creado correctamente');
          this.isLoading.set(false);
          this.router.navigate(['/admin/estudiantes']);
        },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al crear estudiante'); this.isLoading.set(false); }
      });

    } else if (this.isProfessorMode()) {
      const dto = {
        email: d.email, password: d.password,
        firstName: d.firstName, lastName: d.lastName,
        phone: d.phone || undefined,
        teacherCode: d.teacherCode || undefined,
        specialty:   d.specialty   || undefined,
        bio:         d.bio         || undefined,
      };
      this.adminService.createTeacher(dto).subscribe({
        next: () => { this.success.set('Profesor creado correctamente'); this.isLoading.set(false); this.router.navigate(['/admin/profesores']); },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al crear profesor'); this.isLoading.set(false); }
      });

    } else if (this.isParentMode()) {
      const dto = {
        email: d.email, password: d.password,
        firstName: d.firstName, lastName: d.lastName,
        phone: d.phone || undefined,
        relationship: d.relationship || undefined,
        occupation:   d.occupation   || undefined,
      };
      this.adminService.createParent(dto).subscribe({
        next: () => { this.success.set('Apoderado creado correctamente'); this.isLoading.set(false); this.router.navigate(['/admin/padres']); },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al crear apoderado'); this.isLoading.set(false); }
      });

    } else {
      const dto = {
        email: d.email, password: d.password,
        firstName: d.firstName, lastName: d.lastName,
        phone: d.phone || undefined, role: d.role,
      };
      this.adminService.createUser(dto).subscribe({
        next: () => { this.success.set('Usuario creado correctamente'); this.isLoading.set(false); this.router.navigate(['/admin/usuarios']); },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al crear usuario'); this.isLoading.set(false); }
      });
    }
  }

  update(field: string, value: string) {
    this.formData.update(d => ({ ...d, [field]: value }));
  }
}
