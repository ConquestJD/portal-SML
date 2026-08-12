import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TeacherService, Material, TeacherCourse } from '../../../services/teacher.service';

/** Ítem dentro de una carpeta (solo archivos o enlaces; sin subcarpetas). */
export interface FolderItem {
  id: string;
  name: string;
  type: string;
  size: number;
  file?: File;
  isLink: boolean;
  url?: string;
}

/** Carpeta de primer nivel: agrupa archivos (y enlaces opcionales en descripción). */
export interface MaterialFolder {
  id: string;
  name: string;
  description: string;
  materials: FolderItem[];
  expanded: ReturnType<typeof signal<boolean>>;
}

function randomId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

@Component({
  selector: 'app-subir-material',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subir-material.component.html',
  styleUrl: './subir-material.component.css',
})
export class SubirMaterialComponent implements OnInit {
  courseId = signal('');
  materialId = signal('');
  isEditMode = signal(false);
  isLoading = signal(true);
  isSaving = signal(false);
  error = signal('');
  success = signal('');

  course = signal<{ name: string; grade: string; section: string } | null>(null);
  newUnitName = signal('');
  newUnitDescription = signal('');
  units = signal<MaterialFolder[]>([]);

  formData = signal({ title: '', description: '' });
  existingMaterial = signal<Material | null>(null);
  uploadingMoreFiles = signal(false);

  canSave = computed(() => {
    const list = this.units();
    if (!list.length) return false;
    return list.every((u) => u.materials.length > 0);
  });

  canSaveEdit = computed(() => this.formData().title.trim().length > 0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService,
  ) {}

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const mId = this.route.snapshot.paramMap.get('materialId') ?? '';
    this.courseId.set(cId);

    this.teacherService.getCourse(cId).subscribe({
      next: (tc: TeacherCourse) => {
        const grade = [tc.course?.grade, tc.course?.level].filter(Boolean).join(' · ');
        this.course.set({
          name: tc.course?.name ?? '—',
          grade,
          section: (tc.section?.name ?? '').trim(),
        });

        if (mId && mId !== 'nuevo') {
          this.materialId.set(mId);
          this.isEditMode.set(true);
          this.loadMaterialForEdit(mId);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.error.set('No se pudo cargar el curso');
        this.isLoading.set(false);
      },
    });
  }

  private loadMaterialForEdit(mId: string) {
    this.teacherService.getMaterials(this.courseId()).subscribe({
      next: (materials) => {
        const mat = materials.find((m) => m.id === mId);
        if (mat) {
          this.existingMaterial.set(mat);
          this.formData.set({ title: mat.title, description: mat.description ?? '' });
        } else {
          this.error.set('Material no encontrado');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los materiales');
        this.isLoading.set(false);
      },
    });
  }

  addUnit() {
    const name = this.newUnitName().trim();
    if (!name) return;
    const folder: MaterialFolder = {
      id: randomId('folder'),
      name,
      description: this.newUnitDescription().trim(),
      materials: [],
      expanded: signal(true),
    };
    this.units.update((list) => [...list, folder]);
    this.newUnitName.set('');
    this.newUnitDescription.set('');
  }

  removeUnit(unitId: string) {
    this.units.update((list) => list.filter((u) => u.id !== unitId));
  }

  toggleUnit(unitId: string) {
    this.units.update((list) =>
      list.map((u) => {
        if (u.id !== unitId) return u;
        u.expanded.update((v) => !v);
        return u;
      }),
    );
  }

  onFileSelected(event: Event, unitId: string) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      const item: FolderItem = {
        id: randomId('file'),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        file,
        isLink: false,
      };
      this.units.update((list) =>
        list.map((u) => (u.id === unitId ? { ...u, materials: [...u.materials, item] } : u)),
      );
    }
  }

  addLinkFromInputs(unitId: string, nameInput: HTMLInputElement, urlInput: HTMLInputElement) {
    this.addLink(unitId, nameInput.value, urlInput.value);
    nameInput.value = '';
    urlInput.value = '';
  }

  addLink(unitId: string, nameRaw: string, urlRaw: string) {
    const name = nameRaw.trim();
    const url = urlRaw.trim();
    if (!name || !url) return;
    try {
      // Validación mínima de URL
      new URL(url);
    } catch {
      this.error.set('URL inválida');
      return;
    }
    this.error.set('');
    const item: FolderItem = {
      id: randomId('link'),
      name,
      type: 'text/uri-list',
      size: 0,
      isLink: true,
      url,
    };
    this.units.update((list) =>
      list.map((u) => (u.id === unitId ? { ...u, materials: [...u.materials, item] } : u)),
    );
  }

  removeMaterial(unitId: string, materialId: string) {
    this.units.update((list) =>
      list.map((u) =>
        u.id === unitId ? { ...u, materials: u.materials.filter((m) => m.id !== materialId) } : u,
      ),
    );
  }

  cancel() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], {
      queryParams: { tab: 'material' },
      queryParamsHandling: 'merge',
    });
  }

  saveMaterial() {
    if (!this.canSave()) return;
    this.isSaving.set(true);
    this.error.set('');
    const cid = this.courseId();

    const requests = this.units().map((folder) => {
      const files = folder.materials.filter((m) => !m.isLink && m.file);
      const links = folder.materials.filter((m) => m.isLink);
      let desc = folder.description.trim();
      if (links.length) {
        const linkBlock = links.map((l) => `Enlace: ${l.name} — ${l.url}`).join('\n');
        desc = desc ? `${desc}\n\n${linkBlock}` : linkBlock;
      }
      const fd = new FormData();
      fd.append('title', folder.name);
      if (desc) fd.append('description', desc);
      files.forEach((m) => fd.append('files', m.file!));

      return this.teacherService.createMaterial(cid, fd);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.isSaving.set(false);
        void this.router.navigate(['/profesor/cursos', cid], { queryParams: { tab: 'material' } });
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        this.error.set(this.extractHttpError(err));
      },
    });
  }

  saveEdit() {
    if (!this.canSaveEdit()) return;
    this.isSaving.set(true);
    this.error.set('');
    const d = this.formData();
    this.teacherService
      .updateMaterial(this.courseId(), this.materialId(), {
        title: d.title.trim(),
        description: d.description.trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.existingMaterial.update((m) =>
            m ? { ...m, title: updated.title, description: updated.description } : m,
          );
          void this.router.navigate(['/profesor/cursos', this.courseId()], {
            queryParams: { tab: 'material' },
          });
        },
        error: (err: unknown) => {
          this.error.set(this.extractHttpError(err));
          this.isSaving.set(false);
        },
      });
  }

  onEditFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    const mid = this.materialId();
    const cid = this.courseId();
    if (!mid || !cid) return;
    this.uploadingMoreFiles.set(true);
    this.error.set('');
    this.teacherService.appendMaterialFiles(cid, mid, files).subscribe({
      next: (mat) => {
        this.existingMaterial.set(mat);
        this.uploadingMoreFiles.set(false);
      },
      error: (err: unknown) => {
        this.error.set(this.extractHttpError(err));
        this.uploadingMoreFiles.set(false);
      },
    });
  }

  removeEditFile(fileId: string) {
    if (!confirm('¿Eliminar este archivo de la carpeta?')) return;
    const mid = this.materialId();
    const cid = this.courseId();
    if (!mid || !cid) return;
    this.error.set('');
    this.teacherService.deleteMaterialFile(cid, mid, fileId).subscribe({
      next: () => this.refreshEditMaterialFiles(),
      error: (err: unknown) => this.error.set(this.extractHttpError(err)),
    });
  }

  private refreshEditMaterialFiles() {
    this.teacherService.getMaterials(this.courseId()).subscribe({
      next: (list) => {
        const mat = list.find((m) => m.id === this.materialId());
        if (mat) this.existingMaterial.set(mat);
      },
      error: () => this.error.set('No se pudo actualizar la lista de archivos.'),
    });
  }

  editFileLabel(f: { name?: string; filename?: string }): string {
    return (f.filename ?? f.name ?? '').trim() || 'Archivo';
  }

  private extractHttpError(err: unknown): string {
    const e = err as {
      error?: { message?: string | string[]; error?: { message?: string } };
      message?: string;
    };
    const nested = e?.error?.error?.message;
    const raw =
      (typeof nested === 'string' && nested.trim() ? nested : '') ||
      (Array.isArray(e?.error?.message) ? e.error!.message!.filter(Boolean).join('. ') : '') ||
      (typeof e?.error?.message === 'string' ? e.error.message : '') ||
      (typeof e?.message === 'string' ? e.message : '');
    const msg = raw.trim();
    if (!msg) return 'Error al guardar';
    if (/^[a-f0-9]{32,64}$/i.test(msg)) {
      return 'El servidor rechazó la petición (referencia interna). Revisa los archivos adjuntos o inténtalo de nuevo. Si persiste, contacta a soporte.';
    }
    return msg;
  }

  getFileTypeIcon(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t === 'text/uri-list' || t.includes('link')) return 'fa-link';
    if (t.includes('pdf')) return 'fa-file-pdf';
    if (t.includes('word') || t.includes('document')) return 'fa-file-word';
    if (t.includes('sheet') || t.includes('excel')) return 'fa-file-excel';
    if (t.includes('presentation') || t.includes('powerpoint')) return 'fa-file-powerpoint';
    if (t.startsWith('image/')) return 'fa-file-image';
    if (t.startsWith('video/')) return 'fa-file-video';
    if (t.startsWith('audio/')) return 'fa-file-audio';
    return 'fa-file';
  }

  formatFileSize(bytes: number): string {
    if (bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  updateFormField(field: 'title' | 'description', value: string) {
    this.formData.update((d) => ({ ...d, [field]: value }));
  }
}
