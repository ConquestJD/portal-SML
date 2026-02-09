import { Component, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface AcademicHistory {
  year: string;
  level: string;
  grade: string;
  section: string;
  status: string;
  average: number;
}

interface Grade {
  course: string;
  teacher: string;
  evaluations: {
    name: string;
    date: string;
    grade: number;
    maxGrade: number;
  }[];
  average: number;
}

interface AttendanceRecord {
  date: string;
  status: 'presente' | 'tardanza' | 'falta' | 'justificada';
  observations?: string;
}

interface Parent {
  id: string;
  name: string;
  relationship: 'padre' | 'madre' | 'tutor';
  email: string;
  phone: string;
  dni: string;
  address: string;
  isActive: boolean;
}

@Component({
  selector: 'app-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './detalle-estudiante.component.html',
  styleUrl: './detalle-estudiante.component.css'
})
export class DetalleEstudianteComponent {
  studentId = signal('');
  activeTab = signal<'perfil' | 'academico' | 'notas' | 'asistencia' | 'padres' | 'documentos'>('perfil');

  student = signal({
    id: '1',
    name: 'Juan Pérez',
    code: '2024001',
    email: 'juan@colegio.edu',
    username: 'S123456',
    dni: '12345678',
    grade: '3ro',
    section: 'A',
    level: 'secundaria',
    status: 'activo',
    enrollmentDate: '2024-01-15',
    address: 'Av. Principal 123',
    phone: '+51 987654321',
    tutor: 'María Pérez',
    emergencyPhone: '+51 987654322'
  });

  academicHistory = signal<AcademicHistory[]>([
    { year: '2024', level: 'Secundaria', grade: '3ro', section: 'A', status: 'En curso', average: 15.5 },
    { year: '2023', level: 'Secundaria', grade: '2do', section: 'B', status: 'Aprobado', average: 14.8 },
    { year: '2022', level: 'Secundaria', grade: '1ro', section: 'A', status: 'Aprobado', average: 15.2 },
    { year: '2021', level: 'Primaria', grade: '6to', section: 'A', status: 'Aprobado', average: 16.0 }
  ]);

  grades = signal<Grade[]>([
    {
      course: 'Matemática',
      teacher: 'Prof. Ana Martínez',
      evaluations: [
        { name: 'Examen Parcial 1', date: '2024-03-15', grade: 16, maxGrade: 20 },
        { name: 'Tarea 1', date: '2024-03-20', grade: 18, maxGrade: 20 },
        { name: 'Examen Parcial 2', date: '2024-04-10', grade: 15, maxGrade: 20 }
      ],
      average: 16.3
    },
    {
      course: 'Lengua y Literatura',
      teacher: 'Prof. Carlos López',
      evaluations: [
        { name: 'Examen Parcial 1', date: '2024-03-18', grade: 17, maxGrade: 20 },
        { name: 'Tarea 1', date: '2024-03-25', grade: 19, maxGrade: 20 },
        { name: 'Examen Parcial 2', date: '2024-04-12', grade: 16, maxGrade: 20 }
      ],
      average: 17.3
    },
    {
      course: 'Ciencias',
      teacher: 'Prof. María González',
      evaluations: [
        { name: 'Examen Parcial 1', date: '2024-03-20', grade: 15, maxGrade: 20 },
        { name: 'Tarea 1', date: '2024-03-28', grade: 17, maxGrade: 20 },
        { name: 'Examen Parcial 2', date: '2024-04-15', grade: 16, maxGrade: 20 }
      ],
      average: 16.0
    }
  ]);

  attendance = signal<AttendanceRecord[]>([
    { date: '2024-04-15', status: 'presente' },
    { date: '2024-04-14', status: 'presente' },
    { date: '2024-04-13', status: 'tardanza', observations: 'Llegó 10 minutos tarde' },
    { date: '2024-04-12', status: 'presente' },
    { date: '2024-04-11', status: 'falta', observations: 'Sin justificación' },
    { date: '2024-04-10', status: 'presente' },
    { date: '2024-04-09', status: 'justificada', observations: 'Justificado por médico' },
    { date: '2024-04-08', status: 'presente' }
  ]);

  parents = signal<Parent[]>([
    {
      id: '1',
      name: 'María Pérez',
      relationship: 'madre',
      email: 'maria.perez@email.com',
      phone: '+51 987654322',
      dni: '87654321',
      address: 'Av. Principal 123',
      isActive: true
    },
    {
      id: '2',
      name: 'Carlos Pérez',
      relationship: 'padre',
      email: 'carlos.perez@email.com',
      phone: '+51 987654323',
      dni: '76543210',
      address: 'Av. Principal 123',
      isActive: true
    }
  ]);

  attendanceStats = signal({
    total: 30,
    present: 25,
    late: 3,
    absent: 2,
    justified: 0,
    percentage: 83.3
  });

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.studentId.set(params['id']);
      this.loadStudentData(params['id']);
    });
  }

  loadStudentData(id: string) {
    // Simular carga de datos según el ID
    // En producción, esto haría una llamada al API
    setTimeout(() => {
      // Los datos ya están en los signals, solo se actualizarían según el ID
    }, 300);
  }

  setTab(tab: 'perfil' | 'academico' | 'notas' | 'asistencia' | 'padres' | 'documentos') {
    this.activeTab.set(tab);
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'presente') return 'badge-success';
    if (status === 'tardanza') return 'badge-warning';
    if (status === 'justificada') return 'badge-info';
    return 'badge-error';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'presente': 'Presente',
      'tardanza': 'Tardanza',
      'falta': 'Falta',
      'justificada': 'Justificada'
    };
    return labels[status] || status;
  }

  getRelationshipLabel(relationship: string): string {
    const labels: Record<string, string> = {
      'padre': 'Padre',
      'madre': 'Madre',
      'tutor': 'Tutor'
    };
    return labels[relationship] || relationship;
  }
}
