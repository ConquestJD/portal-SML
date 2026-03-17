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
  badge?: string;
  recipients?: { grade?: string; section?: string };
  readDeadline?: string;
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
      data: (r.data ?? []).map(a => this.normalizeAnnouncement(a)),
      meta: r.meta
    })));
  }

  getAnnouncement(id: string): Observable<Announcement> {
    return this.http.get<{ success: boolean; data: Announcement }>(`${this.url}/announcements/${id}`)
      .pipe(map(r => this.normalizeAnnouncement(r.data)));
  }

  private normalizeAnnouncement(a: Announcement): Announcement {
    return {
      ...a,
      date: a.date ?? a.publishedAt,
      read: a.read ?? a.isRead,
      status: a.status ?? (a.isRead ? 'read' : 'unread'),
      fullContent: a.fullContent ?? a.content,
      author: {
        ...a.author,
        name: a.author.name ?? `${a.author.firstName} ${a.author.lastName}`,
        role: a.author.role ?? 'Administrador'
      }
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
