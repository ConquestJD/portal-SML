import { Component, computed, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AcademicPeriod,
  Material,
  TeacherCourse,
  TeacherService,
  encodeMaterialFolderTitle,
  isMaterialFolder,
  materialFolderTitle,
} from '../../../services/teacher.service';
import { pickLocalFiles } from '../_utils/pick-local-files';

interface MaterialLink {
  id: string;
  name: string;
  url: string;
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
  courseLabel = signal('');

  title = signal('');
  description = signal('');
  selectedFiles = signal<File[]>([]);
  links = signal<MaterialLink[]>([]);
  linkName = signal('');
  linkUrl = signal('');
  fileDragOver = signal(false);

  existingMaterial = signal<Material | null>(null);
  uploadingMoreFiles = signal(false);
  periods = signal<AcademicPeriod[]>([]);
  destId = signal('suelto');
  /** Carpeta nueva dentro del destino, o archivos sueltos en esa carpeta. */
  publishKind = signal<'folder' | 'files'>('files');

  pageTitle = computed(() => this.isEditMode() ? 'Editar material' : 'Subir material');

  canSave = computed(() => {
    const hasContent = this.selectedFiles().length > 0 || this.links().length > 0;
    if (!hasContent) return false;
    if (this.publishKind() === 'folder') return this.title().trim().length > 0;
    return true;
  });

  canSaveEdit = computed(() => this.publishKind() !== 'folder' || this.title().trim().length > 0);

  fileCount = computed(() =>
    this.isEditMode()
      ? (this.existingMaterial()?.files?.length ?? 0)
      : this.selectedFiles().length,
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService,
  ) {}

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const mId = this.route.snapshot.paramMap.get('materialId') ?? '';
    this.courseId.set(cId);

    this.teacherService.getCourse(cId).subscribe({
      next: (tc: TeacherCourse) => {
        const name = tc.course?.name ?? '';
        const grade = (tc.course?.grade ?? '').trim();
        const level = (tc.course?.level ?? '').trim();
        this.courseLabel.set([name, [grade, level].filter(Boolean).join(' · ')].filter(Boolean).join(' · '));

        this.teacherService.getCoursePeriods(cId).subscribe({
          next: (periods) => {
            this.periods.set(periods ?? []);
            this.applyDestFromQuery(periods ?? []);
          },
          error: () => this.applyDestFromQuery([]),
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
        this.error.set('No se pudo cargar el curso.');
        this.isLoading.set(false);
      },
    });
  }

  cancel() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], {
      queryParams: { tab: 'material' },
      queryParamsHandling: 'merge',
    });
  }

  fileKey(f: File): string {
    return `${f.name}-${f.size}-${f.lastModified}`;
  }

  formatFileSize(bytes: number | undefined): string {
    if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  mimeTypeLabel(nameOrMime: string): string {
    const t = (nameOrMime ?? '').toLowerCase();
    if (t.includes('pdf') || t.endsWith('.pdf')) return 'PDF';
    if (t.includes('word') || t.includes('document') || /\.docx?$/.test(t)) return 'Documento';
    if (t.includes('sheet') || t.includes('excel') || /\.xlsx?$/.test(t)) return 'Hoja';
    if (t.includes('presentation') || t.includes('powerpoint') || /\.pptx?$/.test(t)) return 'Presentación';
    if (t.includes('image') || /\.(jpe?g|png|gif|webp)$/.test(t)) return 'Imagen';
    if (t.includes('video') || /\.(mp4|mov|webm)$/.test(t)) return 'Video';
    if (t.includes('audio') || /\.(mp3|wav)$/.test(t)) return 'Audio';
    return 'Archivo';
  }

  editFileLabel(f: { name?: string; filename?: string }): string {
    return (f.filename ?? f.name ?? '').trim() || 'Archivo';
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (this.isEditMode()) {
      this.appendEditFiles(files);
    } else {
      this.addFiles(files);
    }
  }

  async browseFiles(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.uploadingMoreFiles()) return;
    const picked = await pickLocalFiles({ multiple: true, startIn: 'documents' });
    if (picked === 'fallback') {
      this.fileInput?.nativeElement.click();
      return;
    }
    if (this.isEditMode()) this.appendEditFiles(picked);
    else this.addFiles(picked);
  }

  onFileDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.fileDragOver.set(true);
  }

  onFileDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (next && zone.contains(next)) return;
    this.fileDragOver.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (this.isEditMode()) {
      this.appendEditFiles(files);
    } else {
      this.addFiles(files);
    }
  }

  removeFile(file: File) {
    const k = this.fileKey(file);
    this.selectedFiles.set(this.selectedFiles().filter(f => this.fileKey(f) !== k));
  }

  addLink() {
    const name = this.linkName().trim();
    const url = this.linkUrl().trim();
    if (!name || !url) return;
    try {
      new URL(url);
    } catch {
      this.error.set('La dirección del enlace no es válida.');
      return;
    }
    this.error.set('');
    this.links.update(list => [...list, { id: randomId('link'), name, url }]);
    this.linkName.set('');
    this.linkUrl.set('');
  }

  removeLink(id: string) {
    this.links.update(list => list.filter(l => l.id !== id));
  }

  saveMaterial() {
    if (!this.canSave() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set('');
    const cid = this.courseId();
    const links = this.links();
    let desc = this.description().trim();
    if (links.length) {
      const block = links.map(l => `Enlace: ${l.name} — ${l.url}`).join('\n');
      desc = desc ? `${desc}\n\n${block}` : block;
    }
    const fd = new FormData();
    const title =
      this.publishKind() === 'folder'
        ? encodeMaterialFolderTitle(this.title())
        : (this.title().trim() || this.selectedFiles()[0]?.name || 'Material');
    fd.append('title', title);
    if (desc) fd.append('description', desc);
    if (this.destId() && this.destId() !== 'suelto') fd.append('periodId', this.destId());
    for (const file of this.selectedFiles()) fd.append('files', file);

    this.teacherService.createMaterial(cid, fd).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.cancel();
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        this.error.set(this.extractHttpError(err));
      },
    });
  }

  saveEdit() {
    if (!this.canSaveEdit() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set('');
    this.teacherService
      .updateMaterial(this.courseId(), this.materialId(), {
        title:
          this.publishKind() === 'folder'
            ? encodeMaterialFolderTitle(this.title())
            : (this.title().trim() || this.existingMaterial()?.title),
        description: this.description().trim() || undefined,
        periodId: this.destId() === 'suelto' ? null : this.destId(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cancel();
        },
        error: (err: unknown) => {
          this.error.set(this.extractHttpError(err));
          this.isSaving.set(false);
        },
      });
  }

  removeEditFile(fileId: string) {
    if (!confirm('¿Quitar este archivo de la carpeta?')) return;
    const mid = this.materialId();
    const cid = this.courseId();
    if (!mid || !cid) return;
    this.error.set('');
    this.teacherService.deleteMaterialFile(cid, mid, fileId).subscribe({
      next: () => this.refreshEditMaterialFiles(),
      error: (err: unknown) => this.error.set(this.extractHttpError(err)),
    });
  }

  private loadMaterialForEdit(mId: string) {
    this.teacherService.getMaterials(this.courseId()).subscribe({
      next: (materials) => {
        const mat = materials.find(m => m.id === mId);
        if (mat) {
          this.existingMaterial.set(mat);
          this.publishKind.set(isMaterialFolder(mat) ? 'folder' : 'files');
          this.title.set(isMaterialFolder(mat) ? materialFolderTitle(mat) : (mat.title ?? ''));
          this.description.set(mat.description ?? '');
          this.destId.set(mat.periodId ?? mat.period?.id ?? 'suelto');
        } else {
          this.error.set('No se encontró este material.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los materiales.');
        this.isLoading.set(false);
      },
    });
  }

  destLabel(): string {
    if (!this.destId() || this.destId() === 'suelto') return 'Fuera de bimestres';
    return this.periods().find(p => p.id === this.destId())?.name ?? 'Bimestre';
  }

  kindHint(): string {
    const dest = this.destLabel();
    if (this.publishKind() === 'folder') {
      return dest === 'Fuera de bimestres'
        ? 'Se crea una carpeta fuera de los bimestres, con los archivos dentro.'
        : `Se crea una carpeta dentro de ${dest}, con los archivos dentro.`;
    }
    return dest === 'Fuera de bimestres'
      ? 'Los archivos quedan sueltos, fuera de los bimestres.'
      : `Los archivos quedan dentro de ${dest}, sin una carpeta extra.`;
  }

  private applyDestFromQuery(periods: AcademicPeriod[]) {
    const modo = (this.route.snapshot.queryParamMap.get('modo') ?? '').toLowerCase();
    if (modo === 'carpeta' || modo === 'folder') this.publishKind.set('folder');
    else if (modo === 'archivos' || modo === 'files') this.publishKind.set('files');

    const raw = this.route.snapshot.queryParamMap.get('destino') ?? '';
    if (raw === 'suelto' || raw === 'none' || raw === '') {
      if (raw === 'suelto' || raw === 'none') {
        this.destId.set('suelto');
        return;
      }
    } else if (periods.some(p => p.id === raw)) {
      this.destId.set(raw);
      return;
    }
    if (this.isEditMode()) return;
    const now = Date.now();
    const current = periods.find(p => {
      const a = p.startDate ? new Date(p.startDate).getTime() : NaN;
      const b = p.endDate ? new Date(p.endDate).getTime() : NaN;
      return Number.isFinite(a) && Number.isFinite(b) && now >= a && now <= b;
    });
    this.destId.set(current?.id ?? periods[0]?.id ?? 'suelto');
  }

  private addFiles(incoming: File[]) {
    const allowed = this.filterAcceptedFiles(incoming);
    if (!allowed.length) return;
    const current = this.selectedFiles();
    const seen = new Set(current.map(f => this.fileKey(f)));
    const next = [...current];
    for (const f of allowed) {
      const k = this.fileKey(f);
      if (seen.has(k)) continue;
      seen.add(k);
      next.push(f);
      if (next.length >= 10) break;
    }
    this.selectedFiles.set(next.slice(0, 10));
  }

  private appendEditFiles(files: File[]) {
    const allowed = this.filterAcceptedFiles(files);
    if (!allowed.length) return;
    const mid = this.materialId();
    const cid = this.courseId();
    if (!mid || !cid) return;
    this.uploadingMoreFiles.set(true);
    this.error.set('');
    this.teacherService.appendMaterialFiles(cid, mid, allowed).subscribe({
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

  private refreshEditMaterialFiles() {
    this.teacherService.getMaterials(this.courseId()).subscribe({
      next: (list) => {
        const mat = list.find(m => m.id === this.materialId());
        if (mat) this.existingMaterial.set(mat);
      },
      error: () => this.error.set('No se pudo actualizar la lista de archivos.'),
    });
  }

  private filterAcceptedFiles(files: File[]): File[] {
    const ok = /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|webp|mp4|mp3|wav)$/i;
    return files.filter(f => ok.test(f.name));
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
    if (!msg) return 'No se pudo guardar el material.';
    if (/^[a-f0-9]{32,64}$/i.test(msg)) {
      return 'El servidor rechazó los archivos. Prueba con menos archivos o un tamaño menor.';
    }
    return msg;
  }
}
