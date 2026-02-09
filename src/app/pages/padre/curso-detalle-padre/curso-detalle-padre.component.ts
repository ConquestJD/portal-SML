import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface UnitMaterial {
  id: string;
  name: string;
  type: 'PDF' | 'Video' | 'Documento' | 'Imagen' | 'Otro' | 'Link';
  size?: string;
  date: string;
  url?: string;
}

interface Unit {
  id: string;
  number: number;
  title: string;
  description: string;
  materials: UnitMaterial[];
  isExpanded: boolean;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'pendiente' | 'entregada' | 'vencida';
  submitted: boolean;
  submittedDate?: string;
  grade?: number;
}

@Component({
  selector: 'app-curso-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './curso-detalle-padre.component.html',
  styleUrl: './curso-detalle-padre.component.css'
})
export class CursoDetallePadreComponent implements OnInit {
  activeTab = signal<'informacion' | 'materiales' | 'tareas'>('informacion');
  isLoading = signal(true);
  courseId = signal<string | null>(null);
  childId = signal<string | null>(null);

  course = signal({
    id: '1',
    code: 'MAT-2024',
    name: 'Matemática',
    teacher: 'Prof. Ana Martínez',
    teacherEmail: 'ana.martinez@colegio.edu',
    teacherPhone: '+51 987654321',
    schedule: [
      { day: 'Lunes', time: '8:00 - 9:30' },
      { day: 'Miércoles', time: '8:00 - 9:30' },
      { day: 'Viernes', time: '8:00 - 9:30' }
    ],
    classroom: 'Aula 201',
    average: 15.5,
    academicYear: '2024'
  });

  units = signal<Unit[]>([
    {
      id: '1',
      number: 1,
      title: 'Unidad 1: Álgebra Básica',
      description: 'Introducción a ecuaciones lineales y sistemas de ecuaciones.',
      isExpanded: false,
      materials: [
        { id: '1', name: 'Guía de Álgebra Básica', type: 'PDF', size: '2.5 MB', date: '2024-03-01' },
        { id: '2', name: 'Video: Resolución de Ecuaciones Lineales', type: 'Video', size: '45 MB', date: '2024-03-05' },
        { id: '3', name: 'Ejercicios Prácticos - Álgebra', type: 'PDF', size: '1.2 MB', date: '2024-03-08' }
      ]
    },
    {
      id: '2',
      number: 2,
      title: 'Unidad 2: Geometría',
      description: 'Áreas, perímetros y volúmenes de figuras geométricas.',
      isExpanded: false,
      materials: [
        { id: '4', name: 'Guía de Geometría', type: 'PDF', size: '3.1 MB', date: '2024-03-15' },
        { id: '5', name: 'Video: Cálculo de Áreas', type: 'Video', size: '52 MB', date: '2024-03-18' },
        { id: '6', name: 'Formulario de Fórmulas Geométricas', type: 'PDF', size: '850 KB', date: '2024-03-20' }
      ]
    },
    {
      id: '3',
      number: 3,
      title: 'Unidad 3: Trigonometría',
      description: 'Funciones trigonométricas y sus aplicaciones.',
      isExpanded: false,
      materials: [
        { id: '7', name: 'Introducción a la Trigonometría', type: 'PDF', size: '2.8 MB', date: '2024-04-01' },
        { id: '8', name: 'Video: Funciones Seno y Coseno', type: 'Video', size: '38 MB', date: '2024-04-05' },
        { id: '9', name: 'Recursos Adicionales', type: 'Link', url: 'https://www.khanacademy.org', date: '2024-04-05' }
      ]
    }
  ]);

  tasks = signal<Task[]>([
    { id: '1', title: 'Tarea: Ejercicios de Álgebra', dueDate: '2024-03-15', status: 'entregada', submitted: true, submittedDate: '2024-03-14', grade: 18 },
    { id: '2', title: 'Proyecto: Resolución de Problemas', dueDate: '2024-03-10', status: 'entregada', submitted: true, submittedDate: '2024-03-09', grade: 17 },
    { id: '3', title: 'Tarea: Problemas de Geometría', dueDate: '2024-03-25', status: 'pendiente', submitted: false },
    { id: '4', title: 'Tarea: Trigonometría Básica', dueDate: '2024-04-10', status: 'pendiente', submitted: false }
  ]);

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId.set(params['id']);
      this.loadCourseData();
    });

    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.childId.set(params['childId']);
      }
    });
  }

  loadCourseData() {
    this.isLoading.set(true);
    setTimeout(() => {
      // Simular carga de datos
      this.isLoading.set(false);
    }, 500);
  }

  setTab(tab: 'informacion' | 'materiales' | 'tareas') {
    this.activeTab.set(tab);
  }

  toggleUnit(unitId: string) {
    this.units.update(units =>
      units.map(unit =>
        unit.id === unitId ? { ...unit, isExpanded: !unit.isExpanded } : unit
      )
    );
  }

  downloadMaterial(material: UnitMaterial) {
    if (material.type === 'Link' && material.url) {
      window.open(material.url, '_blank');
    } else {
      console.log('Descargando:', material.name);
      // En producción, esto descargaría el archivo real
    }
  }

  getMaterialIcon(type: string): string {
    switch (type) {
      case 'PDF': return 'fa-file-pdf';
      case 'Video': return 'fa-video';
      case 'Documento': return 'fa-file-word';
      case 'Imagen': return 'fa-file-image';
      case 'Link': return 'fa-external-link-alt';
      default: return 'fa-file';
    }
  }
}
