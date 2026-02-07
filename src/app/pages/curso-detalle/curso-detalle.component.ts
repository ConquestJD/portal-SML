import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface UnitMaterial {
  id: string;
  name: string;
  type: 'PDF' | 'Video' | 'Documento' | 'Imagen' | 'Otro';
  size: string;
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

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle.component.html',
  styleUrl: './curso-detalle.component.css'
})
export class CursoDetalleComponent {
  activeTab = signal<'contenido' | 'tareas' | 'calificaciones'>('contenido');
  
  course = signal({
    id: '1',
    name: 'Matemática',
    code: 'MAT-2024',
    teacher: 'Prof. Carlos Rodríguez',
    teacherPhoto: 'https://via.placeholder.com/40',
    period: '2024',
    average: 16.5
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
        { id: '8', name: 'Video: Funciones Seno y Coseno', type: 'Video', size: '38 MB', date: '2024-04-05' }
      ]
    }
  ]);

  tasks = signal([
    { id: '1', name: 'Tarea 1: Problemas de Álgebra', status: 'entregada', dueDate: '2024-03-15', grade: 18 },
    { id: '2', name: 'Tarea 2: Geometría', status: 'pendiente', dueDate: '2024-03-25', grade: null }
  ]);

  setTab(tab: 'contenido' | 'tareas' | 'calificaciones') {
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
    // Simulación de descarga
    console.log('Descargando:', material.name);
    // En producción, esto descargaría el archivo real
  }
}
