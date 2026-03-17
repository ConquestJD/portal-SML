import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Message {
  id: string;
  content: string;
  sender: { id: string; firstName: string; lastName: string; role: { name: string } };
  createdAt: string;
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  subject?: string;
  participants: { id: string; firstName: string; lastName: string; role: { name: string }; avatarUrl?: string }[];
  lastMessage?: { content: string; createdAt: string };
  unreadCount: number;
  messages?: Message[];
}

export interface CreateConversationDto {
  teacherId: string;
  parentId: string;
  subject: string;
  teacherAssignmentId: string;
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getConversations(filters: { courseId?: string; childId?: string } = {}): Observable<Conversation[]> {
    let params = new HttpParams();
    if (filters.courseId) params = params.set('courseId', filters.courseId);
    if (filters.childId) params = params.set('childId', filters.childId);
    return this.http.get<{ success: boolean; data: Conversation[] }>(`${this.url}/messaging/conversations`, { params })
      .pipe(map(r => r.data));
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<{ success: boolean; data: Conversation }>(`${this.url}/messaging/conversations/${id}`)
      .pipe(map(r => r.data));
  }

  sendMessage(conversationId: string, content: string): Observable<Message> {
    return this.http.post<{ success: boolean; data: Message }>(
      `${this.url}/messaging/conversations/${conversationId}/messages`,
      { content }
    ).pipe(map(r => r.data));
  }

  markAsRead(conversationId: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/messaging/conversations/${conversationId}/read`, {});
  }

  createConversation(dto: CreateConversationDto): Observable<Conversation> {
    return this.http.post<{ success: boolean; data: Conversation }>(`${this.url}/messaging/conversations`, dto)
      .pipe(map(r => r.data));
  }
}
