import { Component, signal, computed, OnInit, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface MaterialFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
  isLink?: boolean;
}

interface Unit {
  id: string;
  name: string;
  description: string;
  materials: MaterialFile[];
  expanded: WritableSignal<boolean>;
}

interface Course {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
}

@Component({
  selector: 'app-subir-material',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subir-material.component.html',
  styleUrl: './subir-material.component.css'
})
export class SubirMaterialComponent implements OnInit {
  courseId = signal<string | null>(null);
  materialId = signal<string | null>(null);
  isEditMode = signal(false);
  course = signal<Course | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  
  units = signal<Unit[]>([]);
  newUnitName = signal('');
  newUnitDescription = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      if (params['materialId'] && params['materialId'] !== 'nuevo') {
        this.materialId.set(params['materialId']);
        this.isEditMode.set(true);
      }
      this.loadCourse();
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

      // Si es modo edición, cargar unidades existentes
      let mockUnits: Unit[] = [];
      if (this.isEditMode()) {
        mockUnits = [
          {
            id: '1',
            name: 'Unidad 1: Álgebra Básica',
            description: 'Introducción a ecuaciones lineales y sistemas de ecuaciones.',
            materials: [
              { id: '1', name: 'Clase 1: Ecuaciones Lineales', size: 2560000, type: 'application/pdf', url: '#' },
              { id: '2', name: 'Video: Resolución de Sistemas', size: 45000000, type: 'video/mp4', url: '#' }
            ],
            expanded: signal(true)
          },
          {
            id: '2',
            name: 'Unidad 2: Geometría',
            description: 'Áreas, perímetros y volúmenes de figuras geométricas.',
            materials: [
              { id: '3', name: 'Fórmulas Geométricas', size: 1000000, type: 'application/pdf', url: '#' }
            ],
            expanded: signal(false)
          }
        ];
      }

      this.course.set(mockCourse);
      this.units.set(mockUnits);
      this.isLoading.set(false);
    }, 500);
  }

  addUnit() {
    if (!this.newUnitName().trim()) {
      return;
    }

    const newUnit: Unit = {
      id: Date.now().toString() + Math.random(),
      name: this.newUnitName().trim(),
      description: this.newUnitDescription().trim(),
      materials: [],
      expanded: signal(true)
    };

    this.units.update(units => [...units, newUnit]);
    this.newUnitName.set('');
    this.newUnitDescription.set('');
  }

  removeUnit(unitId: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta unidad y todos sus materiales?')) {
      this.units.update(units => units.filter(u => u.id !== unitId));
    }
  }

  toggleUnit(unitId: string) {
    this.units.update(units =>
      units.map(unit =>
        unit.id === unitId ? { ...unit, expanded: signal(!unit.expanded()) } : unit
      )
    );
  }

  onFileSelected(event: Event, unitId: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      files.forEach(file => {
        const material: MaterialFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          file: file
        };
        
        this.units.update(units =>
          units.map(unit =>
            unit.id === unitId
              ? { ...unit, materials: [...unit.materials, material] }
              : unit
          )
        );
      });
    }
    input.value = '';
  }

  addLink(unitId: string, linkName: string, linkUrl: string) {
    if (!linkName.trim() || !linkUrl.trim()) {
      return;
    }

    const material: MaterialFile = {
      id: Date.now().toString() + Math.random(),
      name: linkName.trim(),
      size: 0,
      type: 'link',
      url: linkUrl.trim(),
      isLink: true
    };

    this.units.update(units =>
      units.map(unit =>
        unit.id === unitId
          ? { ...unit, materials: [...unit.materials, material] }
          : unit
      )
    );
  }

  removeMaterial(unitId: string, materialId: string) {
    this.units.update(units =>
      units.map(unit =>
        unit.id === unitId
          ? { ...unit, materials: unit.materials.filter(m => m.id !== materialId) }
          : unit
      )
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return 'Enlace';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getFileTypeIcon(type: string): string {
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('video')) return 'fa-video';
    if (type.includes('image')) return 'fa-file-image';
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    if (type === 'link') return 'fa-link';
    return 'fa-file';
  }

  canSave(): boolean {
    return this.units().length > 0 && 
           this.units().every(unit => unit.materials.length > 0);
  }

  saveMaterial() {
    if (!this.canSave()) {
      alert('Debes crear al menos una unidad con materiales antes de guardar.');
      return;
    }

    this.isSaving.set(true);

    const materialData = {
      courseId: this.courseId()!,
      units: this.units().map(unit => ({
        id: unit.id,
        name: unit.name,
        description: unit.description,
        materials: unit.materials.map(m => ({
          name: m.name,
          size: m.size,
          type: m.type,
          url: m.url,
          isLink: m.isLink
        }))
      }))
    };

    // Simulación de guardado
    setTimeout(() => {
      console.log('Guardando material:', materialData);
      this.isSaving.set(false);
      this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'material' } });
    }, 1000);
  }

  cancel() {
    this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'material' } });
  }
}
