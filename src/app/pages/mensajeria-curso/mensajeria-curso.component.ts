import { Component, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  level: string;
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
  convoQuery = signal('');

  @ViewChild('threadEl') threadEl?: ElementRef<HTMLElement>;

  userRole = computed(() => this.authService.userRole());

  courseKicker = computed(() => {
    const c = this.course();
    if (!c) return 'Santa María Laura';
    const meta = [c.grade, c.level].filter(Boolean).join(' · ');
    return meta ? `${c.name} · ${meta}` : c.name;
  });

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

  visibleConversations = computed(() => {
    const q = this.convoQuery().toLowerCase().trim();
    const list = this.sortedConversations();
    if (!q) return list;
    return list.filter(
      c =>
        c.participantName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q),
    );
  });

  threadBlocks = computed(() => {
    const msgs = this.selectedConversation()?.messages ?? [];
    const blocks: Array<{ type: 'day'; key: string; label: string } | { type: 'msg'; message: CursoMessageUi }> = [];
    let lastKey = '';
    for (const message of msgs) {
      const key = this.dayKey(message.timestamp);
      if (key && key !== lastKey) {
        blocks.push({ type: 'day', key, label: this.dayLabel(key) });
        lastKey = key;
      }
      blocks.push({ type: 'msg', message });
    }
    return blocks;
  });

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
              level: tc.course?.level ?? '',
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
                level: String(course['level'] ?? section['level'] ?? ''),
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
          if (role !== 'profesor') {
            const first = this.sortedConversations()[0];
            if (first && !this.selectedConversation()) this.selectConversation(first);
          }
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
        this.selectedConversation.set({ ...conv, messages: msgs, unreadCount: 0 });
        this.conversations.update(list =>
          list.map(x => (x.id === conv.id ? { ...x, unreadCount: 0 } : x)),
        );
        this.messagingService.markAsRead(conv.id).subscribe();
        this.scrollThread();
      },
    });
  }

  closeConversation() {
    this.selectedConversation.set(null);
  }

  onMessageEnter(event: KeyboardEvent) {
    if (event.shiftKey) return;
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
        const mapped = this.mapOneMessage(msg as unknown as Record<string, unknown>, myId, true);
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
        this.scrollThread();
      },
      error: () => this.sending.set(false),
    });
  }

  getCurrentUserId(): string {
    return this.authService.user()?.id ?? '';
  }

  getInitials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  getInitial(name: string): string {
    return this.getInitials(name);
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `${min} min`;
    const today = this.dayKey(new Date().toISOString());
    if (this.dayKey(iso) === today) {
      return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
    }
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (this.dayKey(iso) === this.dayKey(yest.toISOString())) return 'Ayer';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  formatMessageDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  }

  roleLabel(role: UserRole): string {
    if (role === 'profesor') return 'Profesor';
    if (role === 'padre') return 'Apoderado';
    return 'Estudiante';
  }

  trackBlock(block: { type: 'day'; key: string } | { type: 'msg'; message: CursoMessageUi }): string {
    return block.type === 'day' ? `day-${block.key}` : block.message.id;
  }

  private scrollThread() {
    setTimeout(() => {
      const el = this.threadEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }

  private dayKey(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private dayLabel(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    if (key === this.dayKey(today.toISOString())) return 'Hoy';
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (key === this.dayKey(yest.toISOString())) return 'Ayer';
    const label = date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
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

  private mapOneMessage(
    m: Record<string, unknown>,
    myUserId: string,
    forceMine = false,
  ): CursoMessageUi {
    const sender = m['sender'] as Record<string, unknown> | undefined;
    const fn = (sender?.['firstName'] as string) ?? '';
    const ln = (sender?.['lastName'] as string) ?? '';
    const senderName = `${fn} ${ln}`.trim() || '—';
    const sid = String(m['senderId'] ?? sender?.['id'] ?? '');
    const roleObj = sender?.['role'] as Record<string, unknown> | undefined;
    const roleName = String(roleObj?.['name'] ?? '').toUpperCase();
    const mine = forceMine || (!!myUserId && sid === myUserId);
    let senderRole: UserRole = 'estudiante';
    if (roleName === 'TEACHER' || roleName === 'ADMIN') senderRole = 'profesor';
    else if (roleName === 'PARENT') senderRole = 'padre';
    else if (mine) {
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
