import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Child {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
  photo?: string;
  academicYear: string;
  enrollmentDate: string;
  status: 'Activo' | 'Inactivo';
}

interface ChildProfile {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
  academicYear: string;
  enrollmentDate: string;
  status: 'Activo' | 'Inactivo';
  tutor: {
    name: string;
    email: string;
    phone: string;
  };
  coordinator: {
    name: string;
    email: string;
    phone: string;
  };
  academicSummary: {
    overallAverage: number;
    totalCourses: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    attendancePercentage: number;
    totalAbsences: number;
    totalLates: number;
  };
}

@Component({
  selector: 'app-perfil-hijo',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './perfil-hijo.component.html',
  styleUrl: './perfil-hijo.component.css'
})
export class PerfilHijoComponent implements OnInit {
  selectedChildId = signal<string>('1');
  isLoading = signal(true);
  activeTab = signal<'resumen' | 'academico' | 'contacto'>('resumen');

  children = signal<Child[]>([]);
  childProfile = signal<ChildProfile | null>(null);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer parámetro de ruta si existe
    this.route.params.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      }
    });

    this.loadChildren();
  }

  loadChildren() {
    this.isLoading.set(true);
    
    // Simular carga de hijos
    setTimeout(() => {
      this.children.set([
        {
          id: '1',
          name: 'María Rodríguez',
          code: 'EST-2024-001',
          grade: '3ro',
          section: 'A',
          academicYear: '2024',
          enrollmentDate: '2024-03-01',
          status: 'Activo'
        },
        {
          id: '2',
          name: 'Pedro Rodríguez',
          code: 'EST-2024-002',
          grade: '1ro',
          section: 'B',
          academicYear: '2024',
          enrollmentDate: '2024-03-01',
          status: 'Activo'
        }
      ]);

      this.loadChildProfile();
      this.isLoading.set(false);
    }, 500);
  }

  loadChildProfile() {
    const childId = this.selectedChildId();
    const child = this.children().find(c => c.id === childId);

    if (!child) {
      return;
    }

    // Simular carga de perfil del hijo
    setTimeout(() => {
      const profile: ChildProfile = {
        id: child.id,
        name: child.name,
        code: child.code,
        grade: child.grade,
        section: child.section,
        academicYear: child.academicYear,
        enrollmentDate: child.enrollmentDate,
        status: child.status,
        tutor: {
          name: 'Prof. Ana Martínez',
          email: 'ana.martinez@colegio.edu',
          phone: '+51 987654321'
        },
        coordinator: {
          name: 'Lic. Carlos López',
          email: 'carlos.lopez@colegio.edu',
          phone: '+51 987654322'
        },
        academicSummary: {
          overallAverage: childId === '1' ? 16.5 : 15.2,
          totalCourses: 8,
          totalTasks: childId === '1' ? 24 : 18,
          completedTasks: childId === '1' ? 20 : 15,
          pendingTasks: childId === '1' ? 4 : 3,
          attendancePercentage: childId === '1' ? 95 : 88,
          totalAbsences: childId === '1' ? 2 : 5,
          totalLates: childId === '1' ? 1 : 3
        }
      };

      this.childProfile.set(profile);
    }, 300);
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
    this.loadChildProfile();
  }

  setTab(tab: 'resumen' | 'academico' | 'contacto') {
    this.activeTab.set(tab);
  }

  selectedChild = computed(() => {
    return this.children().find(c => c.id === this.selectedChildId());
  });

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
