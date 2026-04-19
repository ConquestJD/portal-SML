import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AdminService, AcademicYearItem, ScheduleSlot } from '../../../services/admin.service';

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
  scheduleError = signal('');

  pageTitle = computed(() => this.isEditMode() ? 'Editar Curso' : 'Crear Curso');
  pageSubtitle = computed(() => this.isEditMode() ? 'Modifica los datos del curso' : 'Completa los datos del nuevo curso');

  academicYears = signal<AcademicYearItem[]>([]);
  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  readonly colorPalette = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#a855f7'
  ];

  // Calendario: horas mostradas (07:00 a 18:00)
  readonly calendarStartHour = 7;
  readonly calendarEndHour = 18;
  readonly hourSlots = computed(() => {
    const slots: string[] = [];
    for (let h = this.calendarStartHour; h <= this.calendarEndHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  });

  // Formulario para un bloque de horario: un día + rango horario
  scheduleDraft = signal<{ day: string; startTime: string; endTime: string }>({
    day: '',
    startTime: '',
    endTime: ''
  });

  formData = signal({
    name: '',
    code: '',
    level: '',
    grade: '',
    academicYearId: '',
    color: this.colorPalette[0],
    schedule: [] as ScheduleSlot[]
  });

  availableGrades = computed(() => {
    const level = this.formData().level;
    if (level === 'secundaria') return ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'];
    if (level === 'primaria')   return ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'];
    if (level === 'inicial')    return ['3 años', '4 años', '5 años'];
    return [];
  });

  hasSchedule = computed(() => this.formData().schedule.length > 0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        const active = years.find(y => y.status === 'ACTIVE') ?? years[0];
        if (active && !this.formData().academicYearId) {
          this.formData.update(d => ({ ...d, academicYearId: active.id }));
        }
      }
    });

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
          name: data.name,
          code: data.code,
          level: data.level ?? '',
          grade: data.grade ?? '',
          schedule: data.schedule ?? [],
          color: data.color ?? this.colorPalette[0]
        }));
      }
    });
  }

  onLevelChange() {
    this.formData.update(d => ({ ...d, grade: '' }));
  }

  generateCode() {
    const d = this.formData();
    if (!d.name || !d.grade) return;
    const code = (d.grade.substring(0, 3) + '-' + d.name.substring(0, 3)).toUpperCase().replace(/\s/g, '');
    this.formData.update(f => ({ ...f, code }));
  }

  selectColor(color: string) {
    this.formData.update(f => ({ ...f, color }));
  }

  // ─── SCHEDULE ─────────────────────────────────────────────────────────────
  updateScheduleDraft(field: 'day' | 'startTime' | 'endTime', value: string) {
    this.scheduleDraft.update(d => ({ ...d, [field]: value }));
  }

  addScheduleBlock() {
    this.scheduleError.set('');
    const d = this.scheduleDraft();

    if (!d.day) {
      this.scheduleError.set('Selecciona un día');
      return;
    }
    if (!d.startTime || !d.endTime) {
      this.scheduleError.set('Completa hora de inicio y hora de fin');
      return;
    }
    if (d.startTime >= d.endTime) {
      this.scheduleError.set('La hora de inicio debe ser menor que la hora de fin');
      return;
    }

    // Detectar traslape en el mismo día
    const overlaps = this.formData().schedule.some(s =>
      s.day === d.day && !(d.endTime <= s.startTime || d.startTime >= s.endTime)
    );
    if (overlaps) {
      this.scheduleError.set(`Ya hay un bloque en ${d.day} que se cruza con ese horario`);
      return;
    }

    const newBlock: ScheduleSlot = { day: d.day, startTime: d.startTime, endTime: d.endTime };
    this.formData.update(f => ({ ...f, schedule: [...f.schedule, newBlock] }));

    // Reset completo del draft para permitir agregar otro bloque sin bloqueo
    this.scheduleDraft.set({ day: '', startTime: '', endTime: '' });
  }

  removeScheduleBlock(block: ScheduleSlot) {
    this.formData.update(f => ({
      ...f,
      schedule: f.schedule.filter(s => !(s.day === block.day && s.startTime === block.startTime && s.endTime === block.endTime))
    }));
  }

  clearAllSchedule() {
    this.formData.update(f => ({ ...f, schedule: [] }));
  }

  // ─── CALENDAR POSITIONING ────────────────────────────────────────────────
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private calendarStartMinutes(): number { return this.calendarStartHour * 60; }
  private calendarEndMinutes(): number { return this.calendarEndHour * 60; }

  getBlockTop(startTime: string): number {
    return Math.max(0, this.timeToMinutes(startTime) - this.calendarStartMinutes());
  }

  getBlockHeight(startTime: string, endTime: string): number {
    return Math.max(20, this.timeToMinutes(endTime) - this.timeToMinutes(startTime));
  }

  getBlocksForDay(day: string): ScheduleSlot[] {
    return this.formData().schedule
      .filter(s => s.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // ─── SUBMIT ───────────────────────────────────────────────────────────────
  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');
    const d = this.formData();

    if (!d.name || !d.code || !d.level || !d.grade) {
      this.error.set('Completa nombre, código, nivel y grado');
      this.isLoading.set(false);
      return;
    }

    const dto = {
      name: d.name,
      code: d.code,
      grade: d.grade,
      level: d.level,
      schedule: d.schedule,
      color: d.color
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
