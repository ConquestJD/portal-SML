import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-crear-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-curso.component.html',
  styleUrl: './crear-curso.component.css'
})
export class CrearCursoComponent {
  courseId = signal('');
  isEditMode = signal(false);

  formData = signal({
    code: '',
    name: '',
    level: '' as '' | 'secundaria' | 'primaria' | 'inicial',
    grade: '',
    classroom: '',
    academicYear: '',
    status: 'activo' as 'activo' | 'inactivo',
    schedule: [] as Schedule[]
  });

  newSchedule = signal<Schedule>({
    day: '',
    startTime: '',
    endTime: ''
  });

  availableGrades = computed(() => {
    const level = this.formData().level;
    if (level === 'secundaria') {
      return ['1ro', '2do', '3ro', '4to', '5to'];
    } else if (level === 'primaria') {
      return ['1ro', '2do', '3ro', '4to', '5to', '6to'];
    } else if (level === 'inicial') {
      return ['3 años', '4 años', '5 años'];
    }
    return [];
  });

  weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  academicYears = ['2024', '2025', '2026'];

  pageTitle = computed(() => {
    return this.isEditMode() ? 'Editar Curso' : 'Nuevo Curso';
  });

  pageSubtitle = computed(() => {
    return this.isEditMode() ? 'Modifica la información del curso' : 'Registra un nuevo curso en el catálogo';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Detectar si está en modo edición
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.courseId.set(params['id']);
        this.loadCourseData(params['id']);
      }
    });
  }

  loadCourseData(id: string) {
    // Simular carga de datos del curso
    setTimeout(() => {
      const coursesData: Record<string, any> = {
        '1': {
          code: 'MAT-2024-3',
          name: 'Matemática',
          level: 'secundaria',
          grade: '3ro',
          classroom: 'Aula 201',
          academicYear: '2024',
          status: 'activo',
          schedule: [
            { day: 'Lunes', startTime: '08:00', endTime: '09:30' },
            { day: 'Miércoles', startTime: '08:00', endTime: '09:30' },
            { day: 'Viernes', startTime: '08:00', endTime: '09:30' }
          ]
        },
        '2': {
          code: 'LEN-2024-3',
          name: 'Lengua y Literatura',
          level: 'secundaria',
          grade: '3ro',
          classroom: 'Aula 202',
          academicYear: '2024',
          status: 'activo',
          schedule: [
            { day: 'Martes', startTime: '10:00', endTime: '11:30' },
            { day: 'Jueves', startTime: '10:00', endTime: '11:30' }
          ]
        }
      };

      const courseData = coursesData[id];
      if (courseData) {
        this.formData.set({
          code: courseData.code || '',
          name: courseData.name || '',
          level: courseData.level || '',
          grade: courseData.grade || '',
          classroom: courseData.classroom || '',
          academicYear: courseData.academicYear || '',
          status: courseData.status || 'activo',
          schedule: courseData.schedule || []
        });
      }
    }, 300);
  }

  addSchedule() {
    if (this.newSchedule().day && this.newSchedule().startTime && this.newSchedule().endTime) {
      // Verificar que no se duplique el día
      const existingDay = this.formData().schedule.find(s => s.day === this.newSchedule().day);
      if (existingDay) {
        alert('Ya existe un horario para este día. Por favor, edítalo o elimínalo primero.');
        return;
      }

      this.formData.update(d => ({
        ...d,
        schedule: [...d.schedule, { ...this.newSchedule() }]
      }));

      // Resetear el formulario de horario
      this.newSchedule.set({ day: '', startTime: '', endTime: '' });
    }
  }

  removeSchedule(index: number) {
    this.formData.update(d => ({
      ...d,
      schedule: d.schedule.filter((_, i) => i !== index)
    }));
  }

  onSubmit() {
    // Validar formulario
    if (!this.formData().code || !this.formData().name || !this.formData().level || 
        !this.formData().grade || !this.formData().academicYear) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    // Simular guardado
    console.log('Guardando curso:', this.formData());
    
    setTimeout(() => {
      alert(this.isEditMode() ? 'Curso actualizado correctamente' : 'Curso creado correctamente');
      this.router.navigate(['/admin/cursos']);
    }, 500);
  }

  generateCode() {
    const level = this.formData().level;
    const grade = this.formData().grade;
    const academicYear = this.formData().academicYear;
    const name = this.formData().name;

    if (level && grade && academicYear && name) {
      // Generar código: [PRIMERAS 3 LETRAS DEL NOMBRE]-[AÑO]-[GRADO]
      const namePrefix = name.substring(0, 3).toUpperCase();
      const gradeShort = grade.replace('ro', '').replace('to', '').replace(' años', '');
      const code = `${namePrefix}-${academicYear}-${gradeShort}`;
      
      this.formData.update(d => ({ ...d, code }));
    }
  }

  onLevelChange() {
    // Limpiar grado cuando cambia el nivel
    this.formData.update(d => ({ ...d, grade: '', code: '' }));
  }

  onGradeChange() {
    // Regenerar código si cambia grado
    if (this.formData().code) {
      this.generateCode();
    }
  }
}
