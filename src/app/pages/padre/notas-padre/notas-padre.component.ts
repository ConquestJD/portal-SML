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

interface CourseGrade {
  id: string;
  name: string;
  average: number;
  period1: number;
  period2: number;
  period3: number;
  period4: number;
  childId: string;
}

@Component({
  selector: 'app-notas-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notas-padre.component.html',
  styleUrl: './notas-padre.component.css'
})
export class NotasPadreComponent implements OnInit {
  selectedChildId = signal('1');
  isLoading = signal(true);
  
  children = signal<Child[]>([
    { 
      id: '1', 
      name: 'María Rodríguez', 
      grade: '3ro', 
      section: 'A',
      photo: 'https://via.placeholder.com/60'
    },
    { 
      id: '2', 
      name: 'Pedro Rodríguez', 
      grade: '1ro', 
      section: 'B',
      photo: 'https://via.placeholder.com/60'
    }
  ]);

  allCourses = signal<CourseGrade[]>([]);
  periods = signal(['Bimestre 1', 'Bimestre 2', 'Bimestre 3', 'Bimestre 4']);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer query params si existe childId
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      }
    });

    this.loadGrades();
  }

  loadGrades() {
    this.isLoading.set(true);
    
    // Simular carga de notas
    setTimeout(() => {
      // Notas para María (3ro A)
      const mariaCourses: CourseGrade[] = [
        { id: '1', name: 'Matemática', average: 15.5, period1: 15, period2: 16, period3: 15, period4: 16, childId: '1' },
        { id: '2', name: 'Lengua y Literatura', average: 16.0, period1: 16, period2: 16, period3: 16, period4: 16, childId: '1' },
        { id: '3', name: 'Ciencias', average: 14.5, period1: 14, period2: 15, period3: 14, period4: 15, childId: '1' },
        { id: '4', name: 'Historia', average: 17.0, period1: 17, period2: 17, period3: 17, period4: 17, childId: '1' },
        { id: '5', name: 'Inglés', average: 16.5, period1: 16, period2: 17, period3: 16, period4: 17, childId: '1' }
      ];

      // Notas para Pedro (1ro B)
      const pedroCourses: CourseGrade[] = [
        { id: '6', name: 'Matemática', average: 14.0, period1: 13, period2: 14, period3: 14, period4: 15, childId: '2' },
        { id: '7', name: 'Lengua y Literatura', average: 15.5, period1: 15, period2: 15, period3: 16, period4: 16, childId: '2' },
        { id: '8', name: 'Ciencias', average: 15.0, period1: 14, period2: 15, period3: 15, period4: 16, childId: '2' }
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

  overallAverage = computed(() => {
    const childCourses = this.courses();
    if (childCourses.length === 0) return 0;
    const sum = childCourses.reduce((acc, course) => acc + course.average, 0);
    return sum / childCourses.length;
  });

  downloadBoleta() {
    const child = this.selectedChild();
    console.log('Descargar boleta para:', child?.name);
    // En producción, esto descargaría el PDF de la boleta
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
