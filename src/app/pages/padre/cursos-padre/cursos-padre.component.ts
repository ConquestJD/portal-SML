import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Child {
  id: string;
  name: string;
  grade: string;
  section: string;
  photo?: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  teacher: string;
  schedule: string;
  average: number;
  childId: string;
}

@Component({
  selector: 'app-cursos-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cursos-padre.component.html',
  styleUrl: './cursos-padre.component.css'
})
export class CursosPadreComponent implements OnInit {
  selectedChildId = signal('1');
  searchQuery = signal('');
  isLoading = signal(true);
  
  children = signal<Child[]>([
    { 
      id: '1', 
      name: 'María Rodríguez', 
      grade: '3ro', 
      section: 'A',
    },
    { 
      id: '2', 
      name: 'Pedro Rodríguez', 
      grade: '1ro', 
      section: 'B',
    }
  ]);

  allCourses = signal<Course[]>([]);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer query params si existe childId
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      }
    });

    this.loadCourses();
  }

  loadCourses() {
    this.isLoading.set(true);
    
    // Simular carga de cursos
    setTimeout(() => {
      // Cursos para María (3ro A)
      const mariaCourses: Course[] = [
        { id: '1', code: 'MAT-2024', name: 'Matemática', teacher: 'Prof. Ana Martínez', schedule: 'Lun, Mié, Vie 8:00-9:30', average: 15.5, childId: '1' },
        { id: '2', code: 'LEN-2024', name: 'Lengua y Literatura', teacher: 'Prof. Carlos López', schedule: 'Mar, Jue 8:00-9:30', average: 16.0, childId: '1' },
        { id: '3', code: 'CIE-2024', name: 'Ciencias', teacher: 'Prof. Laura García', schedule: 'Lun, Mié 10:00-11:30', average: 14.5, childId: '1' },
        { id: '4', code: 'HIS-2024', name: 'Historia', teacher: 'Prof. Roberto Sánchez', schedule: 'Mar, Jue 10:00-11:30', average: 17.0, childId: '1' },
        { id: '5', code: 'ING-2024', name: 'Inglés', teacher: 'Prof. Patricia López', schedule: 'Lun, Mié, Vie 9:30-11:00', average: 16.5, childId: '1' }
      ];

      // Cursos para Pedro (1ro B)
      const pedroCourses: Course[] = [
        { id: '6', code: 'MAT-2024', name: 'Matemática', teacher: 'Prof. Juan Pérez', schedule: 'Lun, Mié 8:00-9:30', average: 14.0, childId: '2' },
        { id: '7', code: 'LEN-2024', name: 'Lengua y Literatura', teacher: 'Prof. María González', schedule: 'Mar, Jue 8:00-9:30', average: 15.5, childId: '2' },
        { id: '8', code: 'CIE-2024', name: 'Ciencias', teacher: 'Prof. Luis Torres', schedule: 'Lun, Mié 10:00-11:30', average: 15.0, childId: '2' }
      ];

      this.allCourses.set([...mariaCourses, ...pedroCourses]);
      this.isLoading.set(false);
    }, 500);
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
  }

  selectedChild = computed(() => {
    return this.children().find(c => c.id === this.selectedChildId());
  });

  courses = computed(() => {
    return this.allCourses().filter(c => c.childId === this.selectedChildId());
  });

  filteredCourses = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const childCourses = this.courses();
    if (!query) return childCourses;
    return childCourses.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query) ||
      c.teacher.toLowerCase().includes(query)
    );
  });

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
