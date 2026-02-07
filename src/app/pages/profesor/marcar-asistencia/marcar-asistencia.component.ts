import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface Student {
  id: string;
  name: string;
  code: string;
  photo?: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'presente' | 'tarde' | 'falta';
  observation?: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
}

@Component({
  selector: 'app-marcar-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marcar-asistencia.component.html',
  styleUrl: './marcar-asistencia.component.css'
})
export class MarcarAsistenciaComponent implements OnInit {
  courseId = signal<string | null>(null);
  course = signal<Course | null>(null);
  students = signal<Student[]>([]);
  attendanceDate = signal<string>(new Date().toISOString().split('T')[0]);
  attendanceRecords = signal<{ [studentId: string]: AttendanceRecord }>({});
  observations = signal<{ [studentId: string]: string }>({});
  isLoading = signal(true);
  isSaving = signal(false);
  hasChanges = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      this.loadCourse();
    });

    // Leer fecha de query params si existe
    this.route.queryParams.subscribe(params => {
      if (params['fecha']) {
        this.attendanceDate.set(params['fecha']);
      }
    });
  }

  loadCourse() {
    this.isLoading.set(true);
    // Simulación de carga de datos
    setTimeout(() => {
      const mockCourse: Course = {
        id: this.courseId()!,
        name: 'Matemática',
        code: 'MAT-2024',
        grade: '3ro',
        section: 'A'
      };

      const mockStudents: Student[] = [
        { id: '1', name: 'Juan Pérez', code: '2024001' },
        { id: '2', name: 'María García', code: '2024002' },
        { id: '3', name: 'Carlos López', code: '2024003' },
        { id: '4', name: 'Ana Martínez', code: '2024004' },
        { id: '5', name: 'Pedro Sánchez', code: '2024005' },
        { id: '6', name: 'Laura Fernández', code: '2024006' },
        { id: '7', name: 'Roberto Torres', code: '2024007' },
        { id: '8', name: 'Sofía Ramírez', code: '2024008' },
        { id: '9', name: 'Diego Morales', code: '2024009' },
        { id: '10', name: 'Carmen Vargas', code: '2024010' }
      ];

      // Cargar asistencia existente si existe para esta fecha
      const existingAttendance: { [studentId: string]: AttendanceRecord } = {
        '1': { studentId: '1', status: 'presente' },
        '2': { studentId: '2', status: 'presente' },
        '3': { studentId: '3', status: 'tarde', observation: 'Llegó 15 minutos tarde' },
        '4': { studentId: '4', status: 'presente' }
      };

      this.course.set(mockCourse);
      this.students.set(mockStudents);
      this.attendanceRecords.set(existingAttendance);
      this.isLoading.set(false);
    }, 500);
  }

  setAttendance(studentId: string, status: 'presente' | 'tarde' | 'falta') {
    this.attendanceRecords.update(records => ({
      ...records,
      [studentId]: {
        ...records[studentId],
        studentId,
        status
      }
    }));
    this.hasChanges.set(true);
  }

  getAttendanceStatus(studentId: string): 'presente' | 'tarde' | 'falta' | null {
    return this.attendanceRecords()[studentId]?.status || null;
  }

  updateObservation(studentId: string, observation: string) {
    this.observations.update(obs => ({
      ...obs,
      [studentId]: observation
    }));
    this.attendanceRecords.update(records => ({
      ...records,
      [studentId]: {
        ...records[studentId] || { studentId, status: 'presente' },
        observation: observation || undefined
      }
    }));
    this.hasChanges.set(true);
  }

  getObservation(studentId: string): string {
    return this.observations()[studentId] || this.attendanceRecords()[studentId]?.observation || '';
  }

  onDateChange() {
    // Recargar asistencia para la nueva fecha
    this.loadCourse();
    this.hasChanges.set(false);
  }

  markAllPresent() {
    this.students().forEach(student => {
      this.setAttendance(student.id, 'presente');
    });
  }

  markAllAbsent() {
    this.students().forEach(student => {
      this.setAttendance(student.id, 'falta');
    });
  }

  clearAll() {
    this.attendanceRecords.set({});
    this.observations.set({});
    this.hasChanges.set(true);
  }

  attendanceSummary = computed(() => {
    const records = this.attendanceRecords();
    const present = Object.values(records).filter(r => r.status === 'presente').length;
    const late = Object.values(records).filter(r => r.status === 'tarde').length;
    const absent = Object.values(records).filter(r => r.status === 'falta').length;
    const total = this.students().length;
    const unmarked = total - (present + late + absent);

    return { present, late, absent, total, unmarked };
  });

  canSave(): boolean {
    const summary = this.attendanceSummary();
    return summary.unmarked === 0 && this.hasChanges();
  }

  saveAttendance() {
    if (!this.canSave()) {
      return;
    }

    this.isSaving.set(true);

    // Simulación de guardado
    setTimeout(() => {
      const attendanceData = {
        courseId: this.courseId()!,
        date: this.attendanceDate(),
        records: Object.values(this.attendanceRecords()).map(record => ({
          studentId: record.studentId,
          status: record.status,
          observation: record.observation || this.observations()[record.studentId] || undefined
        }))
      };

      console.log('Guardando asistencia:', attendanceData);
      
      this.isSaving.set(false);
      this.hasChanges.set(false);
      
      // Mostrar mensaje de éxito y redirigir
      alert('Asistencia guardada correctamente');
      this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'asistencia' } });
    }, 1000);
  }

  cancel() {
    if (this.hasChanges()) {
      if (confirm('¿Estás seguro de que deseas salir sin guardar los cambios?')) {
        this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'asistencia' } });
      }
    } else {
      this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'asistencia' } });
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'presente': return 'badge-success';
      case 'tarde': return 'badge-warning';
      case 'falta': return 'badge-error';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'presente': return 'Presente';
      case 'tarde': return 'Tarde';
      case 'falta': return 'Falta';
      default: return 'Sin marcar';
    }
  }
}
