import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { MessagingService } from '../../services/messaging.service';
import { AuthService, UserRole } from '../../services/auth.service';
import { TeacherService } from '../../services/teacher.service';
import { StudentService } from '../../services/student.service';

export interface MensajeriaCourseHeader {
  name: string;
  grade: string;
  section: string;
}

export interface CursoConvoUi {
  id: string;
  participantName: string;
  participantRole: UserRole;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: CursoMessageUi[];
}

export interface CursoMessageUi {
  id: string;
  content: string;
  timestamp: string;
  senderName: string;
  senderRole: UserRole;
  read?: boolean;
  attachments?: { id: string; name: string; url?: string; size?: string }[];
}

@Component({
  selector: 'app-mensajeria-curso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mensajeria-curso.component.html',
  styleUrl: './mensajeria-curso.component.css',
})
export class MensajeriaCursoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  courseId = signal('');
  newMessageText = signal('');
  sending = signal(false);
  readonly isLoading = this.loading;
  readonly isSending = this.sending;

  course = signal<MensajeriaCourseHeader | null>(null);
  conversations = signal<CursoConvoUi[]>([]);
  selectedConversation = signal<CursoConvoUi | null>(null);

  userRole = computed(() => this.authService.userRole());

  sortedConversations = computed(() => {
    const list = [...this.conversations()];
    return list.sort((a, b) => {
      const ta = Date.parse(a.lastMessageTime) || 0;
      const tb = Date.parse(b.lastMessageTime) || 0;
      return tb - ta;
    });
  });

  unreadTotal = computed(() =>
    this.conversations().reduce((a, c) => a + (Number(c.unreadCount) || 0), 0),
  );

  constructor(
    private route: ActivatedRoute,
    private messagingService: MessagingService,
    private authService: AuthService,
    private teacherService: TeacherService,
    private studentService: StudentService,
  ) {}

  ngOnInit() {
    const cId =
      this.route.snapshot.paramMap.get('courseId') ?? this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(cId);
    this.loadHeaderAndConversations();
  }

  private loadHeaderAndConversations() {
    this.loading.set(true);
    this.error.set('');
    const cId = this.courseId();
    const role = this.authService.userRole();

    const header$: Observable<MensajeriaCourseHeader | null> = !cId
      ? of(null)
      : role === 'profesor'
        ? this.teacherService.getCourse(cId).pipe(
            map((tc) => ({
              name: tc.course?.name ?? tc.name ?? '—',
              grade: tc.course?.grade ?? tc.grade ?? '',
              section: tc.section?.name ?? '',
            })),
            catchError(() => of(null)),
          )
        : this.studentService.getCourse(cId).pipe(
            map((row) => {
              const sc = row as unknown as Record<string, unknown>;
              const course = (sc['course'] as Record<string, unknown>) ?? {};
              const section = (sc['section'] as Record<string, unknown>) ?? {};
              return {
                name: String(course['name'] ?? (row as { name?: string }).name ?? '—'),
                grade: String(course['grade'] ?? section['grade'] ?? ''),
                section: String(section['name'] ?? ''),
              };
            }),
            catchError(() => of(null)),
          );

    header$
      .pipe(
        switchMap((hdr) => {
          this.course.set(hdr);
          return this.messagingService.getConversations(cId ? { courseId: cId } : {});
        }),
      )
      .subscribe({
        next: (raw) => {
          const myId = this.authService.user()?.id ?? '';
          const list = Array.isArray(raw) ? raw : [];
          this.conversations.set(
            list.map((r) => this.mapListItem(r as unknown as Record<string, unknown>, myId)),
          );
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar conversaciones');
          this.conversations.set([]);
          this.loading.set(false);
        },
      });
  }

  loadConversations() {
    this.loadHeaderAndConversations();
  }

  selectConversation(conv: CursoConvoUi) {
    this.messagingService.getConversation(conv.id).subscribe({
      next: (raw) => {
        const myId = this.authService.user()?.id ?? '';
        const msgs = this.mapMessages(raw as unknown as Record<string, unknown>, myId);
        this.selectedConversation.set({ ...conv, messages: msgs });
        this.messagingService.markAsRead(conv.id).subscribe();
      },
    });
  }

  onMessageEnter(event: KeyboardEvent) {
    event.preventDefault();
    this.sendMessage();
  }

  sendMessage() {
    const conv = this.selectedConversation();
    const content = this.newMessageText().trim();
    if (!conv || !content) return;
    this.sending.set(true);
    this.messagingService.sendMessage(conv.id, content).subscribe({
      next: (msg) => {
        const myId = this.authService.user()?.id ?? '';
        const mapped = this.mapOneMessage(msg as unknown as Record<string, unknown>, myId);
        this.selectedConversation.update((c) =>
          c ? { ...c, messages: [...(c.messages ?? []), mapped] } : c,
        );
        this.newMessageText.set('');
        this.sending.set(false);
        this.conversations.update((list) =>
          list.map((x) =>
            x.id === conv.id
              ? { ...x, lastMessage: content, lastMessageTime: new Date().toISOString() }
              : x,
          ),
        );
      },
      error: () => this.sending.set(false),
    });
  }

  getCurrentUserId(): string {
    return this.authService.user()?.id ?? '';
  }

  getInitial(name: string): string {
    const t = (name ?? '').trim();
    return t ? t.charAt(0).toUpperCase() : '?';
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  formatMessageDate(iso: string): string {
    return this.formatTime(iso);
  }

  private mapListItem(conv: Record<string, unknown>, myUserId: string): CursoConvoUi {
    const otherUser = this.otherParticipantUser(conv, myUserId);
    const nameOther = otherUser
      ? `${otherUser['firstName'] ?? ''} ${otherUser['lastName'] ?? ''}`.trim()
      : '';
    const roleName = String(
      (otherUser?.['role'] as Record<string, unknown> | undefined)?.['name'] ?? '',
    ).toUpperCase();
    const participantRole: UserRole =
      roleName === 'PARENT'
        ? 'padre'
        : roleName === 'STUDENT'
          ? 'estudiante'
          : roleName === 'TEACHER'
            ? 'profesor'
            : 'estudiante';

    const msgs = conv['messages'] as Record<string, unknown>[] | undefined;
    const last = Array.isArray(msgs) && msgs.length ? msgs[0] : null;
    return {
      id: String(conv['id'] ?? ''),
      participantName: nameOther || 'Chat',
      participantRole,
      lastMessage: (last?.['content'] as string) ?? '',
      lastMessageTime:
        (last?.['createdAt'] as string) ?? (conv['updatedAt'] as string) ?? '',
      unreadCount: Number(conv['unreadCount'] ?? 0) || 0,
      messages: [],
    };
  }

  private otherParticipantUser(
    conv: Record<string, unknown>,
    myUserId: string,
  ): Record<string, unknown> | null {
    const parts = conv['participants'] as unknown[] | undefined;
    if (!Array.isArray(parts)) return null;
    for (const p of parts) {
      const pr = p as Record<string, unknown>;
      const tu = pr['teacher'] as Record<string, unknown> | undefined;
      const pu = pr['parent'] as Record<string, unknown> | undefined;
      const su = pr['student'] as Record<string, unknown> | undefined;
      const userNested =
        (tu?.['user'] as Record<string, unknown> | undefined) ??
        (pu?.['user'] as Record<string, unknown> | undefined) ??
        (su?.['user'] as Record<string, unknown> | undefined);
      if (userNested && String(userNested['id'] ?? '') !== myUserId) return userNested;
    }
    for (const p of parts) {
      const pr = p as Record<string, unknown>;
      if (String(pr['id'] ?? '') !== myUserId && pr['firstName'] != null) return pr;
    }
    return null;
  }

  private mapMessages(conv: Record<string, unknown>, myUserId: string): CursoMessageUi[] {
    const msgs = conv['messages'] as unknown[] | undefined;
    if (!Array.isArray(msgs)) return [];
    return msgs.map((m) => this.mapOneMessage(m as Record<string, unknown>, myUserId));
  }

  private mapOneMessage(m: Record<string, unknown>, myUserId: string): CursoMessageUi {
    const sender = m['sender'] as Record<string, unknown> | undefined;
    const fn = (sender?.['firstName'] as string) ?? '';
    const ln = (sender?.['lastName'] as string) ?? '';
    const senderName = `${fn} ${ln}`.trim() || '—';
    const sid = String(sender?.['id'] ?? '');
    const roleObj = sender?.['role'] as Record<string, unknown> | undefined;
    const roleName = String(roleObj?.['name'] ?? '').toUpperCase();
    let senderRole: UserRole = 'estudiante';
    if (roleName === 'TEACHER' || roleName === 'ADMIN') senderRole = 'profesor';
    else if (roleName === 'PARENT') senderRole = 'padre';
    else if (sid === myUserId) {
      senderRole = this.authService.userRole() ?? 'estudiante';
    }

    const attRaw = m['attachments'] as unknown[] | undefined;
    const attachments = Array.isArray(attRaw)
      ? attRaw.map((a) => {
          const ar = a as Record<string, unknown>;
          return {
            id: String(ar['id'] ?? ''),
            name: String(ar['name'] ?? 'Archivo'),
            url: ar['url'] as string | undefined,
            size: ar['size'] != null ? String(ar['size']) : undefined,
          };
        })
      : undefined;

    return {
      id: String(m['id'] ?? ''),
      content: String(m['content'] ?? ''),
      timestamp: String(m['createdAt'] ?? ''),
      senderName,
      senderRole,
      read: Boolean(m['readAt'] ?? m['read']),
      attachments,
    };
  }
}
