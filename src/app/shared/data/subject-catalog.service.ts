import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AdminService, SchoolSettings } from '../../services/admin.service';
import {
  PREDEFINED_SUBJECTS,
  PredefinedSubject,
  SchoolLevel,
  subjectCoverUrl,
} from './predefined-subjects';
import { CourseCoverSubject, resolveCourseSubject } from '../utils/course-cover';

@Injectable({ providedIn: 'root' })
export class SubjectCatalogService {
  private readonly subjectsSig = signal<PredefinedSubject[]>([...PREDEFINED_SUBJECTS]);
  readonly subjects = this.subjectsSig.asReadonly();

  constructor(private adminService: AdminService) {}

  hydrate(stored?: SchoolSettings['subjects'] | null): PredefinedSubject[] {
    const list = stored?.length ? stored.map((s) => this.normalize(s)) : [...PREDEFINED_SUBJECTS];
    this.subjectsSig.set(list);
    return list;
  }

  load(): Observable<PredefinedSubject[]> {
    return this.adminService.getSettings().pipe(
      map((settings) => this.hydrate(settings.subjects)),
      catchError(() => {
        this.subjectsSig.set([...PREDEFINED_SUBJECTS]);
        return of(this.subjectsSig());
      }),
    );
  }

  save(list: PredefinedSubject[]): Observable<PredefinedSubject[]> {
    const next = list.map((s) => this.normalize(s));
    return this.adminService.updateSettings({ subjects: next }).pipe(
      tap((res) => {
        if (res.subjects?.length) this.subjectsSig.set(res.subjects.map((s) => this.normalize(s)));
        else this.subjectsSig.set(next);
      }),
      map(() => this.subjectsSig()),
    );
  }

  forLevel(level: string): PredefinedSubject[] {
    const key = level as SchoolLevel;
    return this.subjectsSig().filter((s) => s.levels.includes(key));
  }

  findById(id: string): PredefinedSubject | undefined {
    return this.subjectsSig().find((s) => s.id === id);
  }

  findByName(name: string): PredefinedSubject | undefined {
    const n = (name ?? '').trim().toLowerCase();
    if (!n) return undefined;
    return this.subjectsSig().find((s) => s.name.toLowerCase() === n);
  }

  coverUrl(subject: PredefinedSubject): string {
    return subjectCoverUrl(subject);
  }

  slug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `materia-${Date.now().toString(36)}`;
  }

  prefixFromName(name: string): string {
    const letters = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase();
    return (letters.slice(0, 3) || 'MAT');
  }

  normalize(raw: {
    id?: string;
    name?: string;
    codePrefix?: string;
    color?: string;
    coverKey?: string;
    levels?: string[];
  }): PredefinedSubject {
    const name = String(raw.name ?? '').trim();
    const id = String(raw.id ?? '').trim() || this.slug(name);
    const levels = (raw.levels ?? []).filter((l): l is SchoolLevel =>
      l === 'inicial' || l === 'primaria' || l === 'secundaria'
    );
    return {
      id,
      name,
      codePrefix: (raw.codePrefix || this.prefixFromName(name)).slice(0, 4).toUpperCase(),
      color: /^#([0-9a-fA-F]{6})$/.test(raw.color ?? '') ? raw.color! : '#003366',
      coverKey: (raw.coverKey as CourseCoverSubject) || resolveCourseSubject(name),
      levels: levels.length ? levels : ['primaria', 'secundaria'],
    };
  }
}
