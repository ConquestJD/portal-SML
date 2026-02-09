import { Component, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Course {
  id: string;
  code: string;
  name: string;
  level: 'secundaria' | 'primaria' | 'inicial';
  grade: string;
  section: string;
  students: number;
  schedule: {
    day: string;
    time: string;
  }[];
  classroom: string;
  academicYear: string;
  status: 'activo' | 'finalizado';
  startDate: string;
  endDate?: string;
}

@Component({
  selector: 'app-detalle-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule],
  templateUrl: './detalle-profesor.component.html',
  styleUrl: './detalle-profesor.component.css'
})
export class DetalleProfesorComponent {
  profesorId = signal('');
  activeTab = signal<'perfil' | 'cursos' | 'historial'>('perfil');

  profesor = signal({
    id: '1',
    name: 'Prof. Ana Martínez',
    email: 'ana.martinez@colegio.edu',
    username: 'prof_ana',
    dni: '12345678',
    phone: '+51 987654321',
    address: 'Av. Principal 456, Lima',
    department: 'Matemática',
    specialization: 'Álgebra y Geometría',
    status: 'activo',
    hireDate: '2020-01-15',
    degree: 'Licenciada en Matemáticas',
    university: 'Universidad Nacional Mayor de San Marcos'
  });

  allCourses = signal<Course[]>([
    {
      id: '1',
      code: 'MAT-2024-3A',
      name: 'Matemática',
      level: 'secundaria',
      grade: '3ro',
      section: 'A',
      students: 30,
      schedule: [
        { day: 'Lunes', time: '8:00 - 9:30' },
        { day: 'Miércoles', time: '8:00 - 9:30' },
        { day: 'Viernes', time: '8:00 - 9:30' }
      ],
      classroom: 'Aula 201',
      academicYear: '2024',
      status: 'activo',
      startDate: '2024-03-01'
    },
    {
      id: '2',
      code: 'MAT-2024-3B',
      name: 'Matemática',
      level: 'secundaria',
      grade: '3ro',
      section: 'B',
      students: 28,
      schedule: [
        { day: 'Martes', time: '10:00 - 11:30' },
        { day: 'Jueves', time: '10:00 - 11:30' }
      ],
      classroom: 'Aula 202',
      academicYear: '2024',
      status: 'activo',
      startDate: '2024-03-01'
    },
    {
      id: '3',
      code: 'MAT-2023-4A',
      name: 'Matemática',
      level: 'secundaria',
      grade: '4to',
      section: 'A',
      students: 32,
      schedule: [
        { day: 'Lunes', time: '10:00 - 11:30' },
        { day: 'Miércoles', time: '10:00 - 11:30' }
      ],
      classroom: 'Aula 301',
      academicYear: '2023',
      status: 'finalizado',
      startDate: '2023-03-01',
      endDate: '2023-12-15'
    },
    {
      id: '4',
      code: 'MAT-2023-2B',
      name: 'Matemática',
      level: 'secundaria',
      grade: '2do',
      section: 'B',
      students: 29,
      schedule: [
        { day: 'Martes', time: '8:00 - 9:30' },
        { day: 'Jueves', time: '8:00 - 9:30' }
      ],
      classroom: 'Aula 101',
      academicYear: '2023',
      status: 'finalizado',
      startDate: '2023-03-01',
      endDate: '2023-12-15'
    }
  ]);

  availableCourses = signal<Course[]>([
    {
      id: '5',
      code: 'MAT-2024-4A',
      name: 'Matemática',
      level: 'secundaria',
      grade: '4to',
      section: 'A',
      students: 0,
      schedule: [],
      classroom: 'Aula 301',
      academicYear: '2024',
      status: 'activo',
      startDate: '2024-03-01'
    },
    {
      id: '6',
      code: 'ALG-2024-5A',
      name: 'Álgebra',
      level: 'secundaria',
      grade: '5to',
      section: 'A',
      students: 0,
      schedule: [],
      classroom: 'Aula 401',
      academicYear: '2024',
      status: 'activo',
      startDate: '2024-03-01'
    }
  ]);

  showAssignCourseModal = signal(false);
  selectedCourseId = signal('');

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.profesorId.set(params['id']);
      this.loadProfessorData(params['id']);
    });
  }

  loadProfessorData(id: string) {
    // Simular carga de datos según el ID
    setTimeout(() => {
      const professorsData: Record<string, any> = {
        '1': {
          id: '1',
          name: 'Prof. Ana Martínez',
          email: 'ana.martinez@colegio.edu',
          username: 'prof_ana',
          dni: '12345678',
          phone: '+51 987654321',
          address: 'Av. Principal 456, Lima',
          department: 'Matemática',
          specialization: 'Álgebra y Geometría',
          status: 'activo',
          hireDate: '2020-01-15',
          degree: 'Licenciada en Matemáticas',
          university: 'Universidad Nacional Mayor de San Marcos'
        },
        '2': {
          id: '2',
          name: 'Prof. Luis Rodríguez',
          email: 'luis.rodriguez@colegio.edu',
          username: 'prof_luis',
          dni: '23456789',
          phone: '+51 987654322',
          address: 'Jr. Los Olivos 789, San Isidro',
          department: 'Lengua y Literatura',
          specialization: 'Literatura Peruana',
          status: 'activo',
          hireDate: '2019-03-10',
          degree: 'Licenciado en Literatura',
          university: 'Pontificia Universidad Católica del Perú'
        }
      };

      const professorData = professorsData[id];
      if (professorData) {
        this.profesor.set(professorData);
      }
    }, 300);
  }

  activeCourses = computed(() => {
    return this.allCourses().filter(c => c.status === 'activo');
  });

  finishedCourses = computed(() => {
    return this.allCourses().filter(c => c.status === 'finalizado');
  });

  availableCoursesForAssignment = computed(() => {
    const assignedIds = this.allCourses().map(c => c.id);
    return this.availableCourses().filter(c => !assignedIds.includes(c.id));
  });

  selectedCourse = computed(() => {
    if (!this.selectedCourseId()) return null;
    return this.availableCoursesForAssignment().find(c => c.id === this.selectedCourseId()) || null;
  });

  setTab(tab: 'perfil' | 'cursos' | 'historial') {
    this.activeTab.set(tab);
  }

  openAssignCourseModal() {
    this.showAssignCourseModal.set(true);
    this.selectedCourseId.set('');
  }

  closeAssignCourseModal() {
    this.showAssignCourseModal.set(false);
    this.selectedCourseId.set('');
  }

  assignCourse() {
    if (!this.selectedCourseId()) {
      alert('Por favor selecciona un curso');
      return;
    }

    const course = this.availableCoursesForAssignment().find(c => c.id === this.selectedCourseId());
    if (course) {
      // Agregar el curso a la lista de cursos del profesor
      this.allCourses.update(courses => [...courses, { ...course, status: 'activo' as const }]);
      this.closeAssignCourseModal();
      alert('Curso asignado correctamente');
    }
  }

  removeCourse(courseId: string) {
    if (confirm('¿Estás seguro de desasignar este curso?')) {
      this.allCourses.update(courses => courses.filter(c => c.id !== courseId));
    }
  }

  getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'secundaria': 'Secundaria',
      'primaria': 'Primaria',
      'inicial': 'Inicial'
    };
    return labels[level] || level;
  }
}
