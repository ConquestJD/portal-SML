import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  fullContent?: string;
  type: string;
  priority: string;
  targetRoles: string[];
  publishedAt: string;
  date?: string;
  expiresAt?: string;
  isRead: boolean;
  read?: boolean;
  status?: string;
  readAt?: string | null;
  author: { firstName: string; lastName: string; role?: string; name?: string };
  attachments: AnnouncementAttachment[];
  attachmentCount?: number;
  badge?: string;
  recipients?: { grade?: string; section?: string };
  readDeadline?: string;
  /** Id de asignación docente (mismo valor que en rutas `/profesor/cursos/:id`). */
  teacherAssignmentId?: string | null;
  /**
   * Alias para el portal del profesor: id de **TeacherAssignment**, no del curso catálogo.
   * Viene de `teacherAssignmentId` del API.
   */
  courseId?: string;
  /** Texto para mostrar el curso (nombre · grado · nivel). */
  course?: string;
  urgent?: boolean;
}

export interface AnnouncementAttachment {
  id: string;
  name: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AnnouncementFilters {
  type?: string;
  priority?: string;
  read?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: string;
  priority: string;
  targetRoles: string[];
  publishedAt?: string;
  expiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAnnouncements(filters: AnnouncementFilters = {}): Observable<{ data: Announcement[]; meta: PageMeta }> {
    let params = new HttpParams();
    if (filters.type) params = params.set('type', filters.type);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.read !== undefined) params = params.set('read', String(filters.read));
    if (filters.search) params = params.set('search', filters.search);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<{ success: boolean; data: Announcement[]; meta: PageMeta }>(
      `${this.url}/announcements`, { params }
    ).pipe(map(r => ({
      data: (r.data ?? []).map(a => this.normalizeAnnouncement(a as Announcement)),
      meta: r.meta ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 }
    })));
  }

  getAnnouncement(id: string): Observable<Announcement> {
    return this.http.get<{ success: boolean; data: Announcement }>(`${this.url}/announcements/${id}`)
      .pipe(map(r => this.normalizeAnnouncement(r.data)));
  }

  private normalizeAnnouncement(a: Announcement | Record<string, unknown>): Announcement {
    const raw = a as Record<string, unknown>;
    const attRaw = raw['attachments'];
    const attachments = Array.isArray(attRaw)
      ? (attRaw as Record<string, unknown>[]).map((f) => ({
          id: String(f['id'] ?? ''),
          name: String(f['name'] ?? f['filename'] ?? 'Archivo'),
          url: f['url'] as string | undefined,
          size: typeof f['size'] === 'number' ? f['size'] : undefined,
          mimeType: String(f['mimeType'] ?? ''),
        }))
      : [];
    const isRead = Boolean(raw['isRead'] ?? raw['read']);
    const author = (raw['author'] as Announcement['author']) ?? {
      firstName: '',
      lastName: '',
    };
    const prio = String(raw['priority'] ?? '').toUpperCase();
    const taRaw = raw['teacherAssignment'] as
      | {
          id?: string;
          course?: { name?: string; grade?: string; level?: string };
        }
      | undefined;
    const fromApiTaId = raw['teacherAssignmentId'];
    const assignmentId =
      (fromApiTaId != null && String(fromApiTaId).trim() !== ''
        ? String(fromApiTaId)
        : null) ??
      (taRaw?.id != null && String(taRaw.id).trim() !== '' ? String(taRaw.id) : null);

    const courseParts: string[] = [];
    if (typeof raw['course'] === 'string' && (raw['course'] as string).trim()) {
      courseParts.push((raw['course'] as string).trim());
    } else if (taRaw?.course) {
      const cn = taRaw.course.name?.trim();
      const g = taRaw.course.grade?.trim();
      const lv = taRaw.course.level?.trim();
      const gl = [g, lv].filter(Boolean).join(' · ');
      if (cn) courseParts.push(cn);
      if (gl) courseParts.push(gl);
    }
    const courseLabel = courseParts.length ? courseParts.join(' — ') : '';

    return {
      ...(raw as unknown as Announcement),
      attachments,
      attachmentCount: attachments.length,
      date: (raw['date'] as string) ?? (raw['publishedAt'] as string),
      isRead,
      read: isRead,
      status: (raw['status'] as string) ?? (isRead ? 'read' : 'unread'),
      fullContent: (raw['fullContent'] as string) ?? (raw['content'] as string),
      teacherAssignmentId: assignmentId,
      courseId: assignmentId ?? undefined,
      course: courseLabel || undefined,
      urgent: prio === 'HIGH',
      author: {
        ...author,
        name: author.name ?? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim(),
        role: author.role ?? 'Equipo',
      },
    };
  }

  create(dto: CreateAnnouncementDto): Observable<Announcement> {
    return this.http.post<{ success: boolean; data: Announcement }>(`${this.url}/announcements`, dto)
      .pipe(map(r => r.data));
  }

  update(id: string, dto: Partial<CreateAnnouncementDto>): Observable<Announcement> {
    return this.http.put<{ success: boolean; data: Announcement }>(`${this.url}/announcements/${id}`, dto)
      .pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/announcements/${id}`);
  }

  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/announcements/${id}/read`, {});
  }

  uploadAttachments(id: string, files: File[]): Observable<unknown> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return this.http.post(`${this.url}/announcements/${id}/attachments`, formData);
  }

  getDownloadUrl(announcementId: string, fileId: string): string {
    return `${this.url}/announcements/${announcementId}/attachments/${fileId}/download`;
  }
}
