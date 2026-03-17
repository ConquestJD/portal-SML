import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AdminService, AcademicYearItem } from '../../../services/admin.service';

@Component({
  selector: 'app-crear-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-curso.component.html',
  styleUrl: './crear-curso.component.css'
})
export class CrearCursoComponent implements OnInit {
  isEditMode = signal(false);
  courseId = signal('');
  isLoading = signal(false);
  error = signal('');
  success = signal('');

  pageTitle = computed(() => this.isEditMode() ? 'Editar Curso' : 'Crear Curso');
  pageSubtitle = computed(() => this.isEditMode() ? 'Modifica los datos del curso' : 'Completa los datos del nuevo curso');

  academicYears: AcademicYearItem[] = [];
  weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  newSchedule = signal({ day: '', startTime: '', endTime: '' });

  formData = signal({
    name: '',
    code: '',
    description: '',
    level: '',
    grade: '',
    hours: 4,
    academicYear: '',
    classroom: '',
    status: 'ACTIVE',
    schedule: [] as { day: string; startTime: string; endTime: string }[]
  });

  availableGrades = computed(() => {
    const level = this.formData().level;
    if (level === 'Secundaria') return ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'];
    if (level === 'Primaria') return ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'];
    if (level === 'Inicial') return ['3 años', '4 años', '5 años'];
    return [];
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({ next: d => { this.academicYears = d; } });
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.courseId.set(params['id']);
        this.loadCourse(params['id']);
      }
    });
  }

  loadCourse(id: string) {
    this.adminService.getCourse(id).subscribe({
      next: (data) => {
        this.formData.update(d => ({
          ...d,
          name: data.name, code: data.code,
          description: data.description ?? '',
          level: data.level ?? '', grade: data.grade ?? '',
          hours: data.hours ?? 4, status: data.status ?? 'ACTIVE'
        }));
      }
    });
  }

  onLevelChange() { this.formData.update(d => ({ ...d, grade: '' })); }
  onGradeChange() {}
  generateCode() {
    const d = this.formData();
    const code = (d.grade.substring(0, 3) + '-' + d.name.substring(0, 3)).toUpperCase().replace(/\s/g, '');
    this.formData.update(f => ({ ...f, code }));
  }

  addSchedule() {
    const s = this.newSchedule();
    if (!s.day || !s.startTime || !s.endTime) return;
    this.formData.update(d => ({ ...d, schedule: [...d.schedule, { ...s }] }));
    this.newSchedule.set({ day: '', startTime: '', endTime: '' });
  }

  removeSchedule(index: number) {
    this.formData.update(d => ({ ...d, schedule: d.schedule.filter((_, i) => i !== index) }));
  }

  updateSchedule(field: string, value: string) { this.newSchedule.update(s => ({ ...s, [field]: value })); }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    const d = this.formData();
    const dto = {
      name: d.name, code: d.code,
      description: d.description || undefined,
      grade: d.grade || undefined,
      level: d.level || undefined,
      hours: d.hours
    };

    const obs = this.isEditMode()
      ? this.adminService.updateCourse(this.courseId(), dto)
      : this.adminService.createCourse(dto);

    obs.subscribe({
      next: () => {
        this.success.set(this.isEditMode() ? 'Curso actualizado' : 'Curso creado');
        this.isLoading.set(false);
        this.router.navigate(['/admin/cursos']);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Error al guardar el curso');
        this.isLoading.set(false);
      }
    });
  }

  update(field: string, value: unknown) {
    this.formData.update(d => ({ ...d, [field]: value }));
  }
}
