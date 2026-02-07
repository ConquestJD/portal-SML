import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'profesor' | 'estudiante';
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: 'profesor' | 'estudiante';
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

interface Course {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
}

@Component({
  selector: 'app-mensajeria-curso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mensajeria-curso.component.html',
  styleUrl: './mensajeria-curso.component.css'
})
export class MensajeriaCursoComponent implements OnInit {
  courseId = signal<string | null>(null);
  userRole = signal<'profesor' | 'estudiante'>('profesor');
  course = signal<Course | null>(null);
  isLoading = signal(true);

  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  newMessageText = signal('');
  isSending = signal(false);

  // Para estudiantes: mostrar mensajes directos con el profesor
  // Para profesores: mostrar lista de conversaciones con estudiantes

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Detectar el rol basado en la ruta
    const path = this.router.url;
    if (path.includes('/profesor/')) {
      this.userRole.set('profesor');
    } else {
      this.userRole.set('estudiante');
    }

    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId'] || params['id']);
      this.loadCourseAndMessages();
    });
  }

  loadCourseAndMessages() {
    this.isLoading.set(true);
    
    setTimeout(() => {
      // Simular carga de datos del curso
      this.course.set({
        id: this.courseId()!,
        name: 'Matemática',
        code: 'MAT-2024',
        grade: '3ro',
        section: 'A'
      });

      if (this.userRole() === 'profesor') {
        // Para profesores: lista de conversaciones con estudiantes
        this.loadProfessorConversations();
      } else {
        // Para estudiantes: conversación directa con el profesor
        this.loadStudentConversation();
      }

      this.isLoading.set(false);
    }, 500);
  }

  loadProfessorConversations() {
    const mockConversations: Conversation[] = [
      {
        id: 'conv-1',
        participantId: 'student-1',
        participantName: 'Juan Pérez',
        participantRole: 'estudiante',
        lastMessage: 'Profesor, tengo una duda sobre el ejercicio 5 de la tarea...',
        lastMessageTime: '2024-03-20T14:30:00',
        unreadCount: 2,
        messages: [
          {
            id: 'msg-1',
            senderId: 'student-1',
            senderName: 'Juan Pérez',
            senderRole: 'estudiante',
            content: 'Buenos días profesor, tengo una duda sobre el ejercicio 5 de la tarea de álgebra.',
            timestamp: '2024-03-20T10:15:00',
            read: true
          },
          {
            id: 'msg-2',
            senderId: 'prof-1',
            senderName: 'Prof. María González',
            senderRole: 'profesor',
            content: 'Hola Juan, claro. ¿Cuál es tu duda específica?',
            timestamp: '2024-03-20T10:30:00',
            read: true
          },
          {
            id: 'msg-3',
            senderId: 'student-1',
            senderName: 'Juan Pérez',
            senderRole: 'estudiante',
            content: 'No entiendo cómo aplicar la propiedad distributiva en el paso 3.',
            timestamp: '2024-03-20T11:00:00',
            read: true
          },
          {
            id: 'msg-4',
            senderId: 'student-1',
            senderName: 'Juan Pérez',
            senderRole: 'estudiante',
            content: 'Profesor, tengo una duda sobre el ejercicio 5 de la tarea...',
            timestamp: '2024-03-20T14:30:00',
            read: false
          }
        ]
      },
      {
        id: 'conv-2',
        participantId: 'student-2',
        participantName: 'María García',
        participantRole: 'estudiante',
        lastMessage: 'Gracias por la explicación, ya entendí.',
        lastMessageTime: '2024-03-19T16:45:00',
        unreadCount: 0,
        messages: [
          {
            id: 'msg-5',
            senderId: 'student-2',
            senderName: 'María García',
            senderRole: 'estudiante',
            content: 'Profesora, ¿puede explicarme el tema de ecuaciones cuadráticas?',
            timestamp: '2024-03-19T15:00:00',
            read: true
          },
          {
            id: 'msg-6',
            senderId: 'prof-1',
            senderName: 'Prof. María González',
            senderRole: 'profesor',
            content: 'Claro María. Las ecuaciones cuadráticas tienen la forma ax² + bx + c = 0. Te envío un material adicional.',
            timestamp: '2024-03-19T15:30:00',
            read: true,
            attachments: [
              {
                id: 'att-1',
                name: 'ecuaciones_cuadraticas.pdf',
                type: 'PDF',
                size: '2.5 MB',
                url: '#'
              }
            ]
          },
          {
            id: 'msg-7',
            senderId: 'student-2',
            senderName: 'María García',
            senderRole: 'estudiante',
            content: 'Gracias por la explicación, ya entendí.',
            timestamp: '2024-03-19T16:45:00',
            read: true
          }
        ]
      },
      {
        id: 'conv-3',
        participantId: 'student-3',
        participantName: 'Carlos López',
        participantRole: 'estudiante',
        lastMessage: '¿Cuándo es el examen parcial?',
        lastMessageTime: '2024-03-18T09:20:00',
        unreadCount: 0,
        messages: [
          {
            id: 'msg-8',
            senderId: 'student-3',
            senderName: 'Carlos López',
            senderRole: 'estudiante',
            content: '¿Cuándo es el examen parcial?',
            timestamp: '2024-03-18T09:20:00',
            read: true
          },
          {
            id: 'msg-9',
            senderId: 'prof-1',
            senderName: 'Prof. María González',
            senderRole: 'profesor',
            content: 'El examen parcial será el próximo viernes 25 de marzo a las 8:00 AM. Recuerda traer calculadora.',
            timestamp: '2024-03-18T10:00:00',
            read: true
          }
        ]
      }
    ];

    this.conversations.set(mockConversations);
    
    // Seleccionar la primera conversación por defecto
    if (mockConversations.length > 0) {
      this.selectConversation(mockConversations[0]);
    }
  }

  loadStudentConversation() {
    // Para estudiantes: una sola conversación con el profesor del curso
    const mockConversation: Conversation = {
      id: 'conv-prof',
      participantId: 'prof-1',
      participantName: 'Prof. María González',
      participantRole: 'profesor',
      lastMessage: 'Recuerda revisar el material antes de la clase.',
      lastMessageTime: '2024-03-20T08:00:00',
      unreadCount: 1,
      messages: [
        {
          id: 'msg-10',
          senderId: 'student-1',
          senderName: 'Tú',
          senderRole: 'estudiante',
          content: 'Buenos días profesor, tengo una duda sobre la tarea.',
          timestamp: '2024-03-19T14:00:00',
          read: true
        },
        {
          id: 'msg-11',
          senderId: 'prof-1',
          senderName: 'Prof. María González',
          senderRole: 'profesor',
          content: 'Hola, claro. ¿En qué puedo ayudarte?',
          timestamp: '2024-03-19T14:15:00',
          read: true
        },
        {
          id: 'msg-12',
          senderId: 'student-1',
          senderName: 'Tú',
          senderRole: 'estudiante',
          content: 'No entiendo el ejercicio 3, ¿puede explicarme?',
          timestamp: '2024-03-19T14:20:00',
          read: true
        },
        {
          id: 'msg-13',
          senderId: 'prof-1',
          senderName: 'Prof. María González',
          senderRole: 'profesor',
          content: 'Claro, el ejercicio 3 requiere aplicar la fórmula cuadrática. Te envío un ejemplo resuelto.',
          timestamp: '2024-03-19T14:30:00',
          read: true,
          attachments: [
            {
              id: 'att-2',
              name: 'ejemplo_ejercicio3.pdf',
              type: 'PDF',
              size: '1.2 MB',
              url: '#'
            }
          ]
        },
        {
          id: 'msg-14',
          senderId: 'prof-1',
          senderName: 'Prof. María González',
          senderRole: 'profesor',
          content: 'Recuerda revisar el material antes de la clase.',
          timestamp: '2024-03-20T08:00:00',
          read: false
        }
      ]
    };

    this.conversations.set([mockConversation]);
    this.selectedConversation.set(mockConversation);
  }

  selectConversation(conversation: Conversation) {
    this.selectedConversation.set(conversation);
    // Marcar mensajes como leídos
    this.markConversationAsRead(conversation.id);
  }

  markConversationAsRead(conversationId: string) {
    this.conversations.update(convs =>
      convs.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = conv.messages.map(msg => ({ ...msg, read: true }));
          return {
            ...conv,
            messages: updatedMessages,
            unreadCount: 0
          };
        }
        return conv;
      })
    );

    // Actualizar la conversación seleccionada
    const updated = this.conversations().find(c => c.id === conversationId);
    if (updated) {
      this.selectedConversation.set(updated);
    }
  }

  sendMessage() {
    const text = this.newMessageText().trim();
    if (!text || !this.selectedConversation()) {
      return;
    }

    this.isSending.set(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: this.userRole() === 'profesor' ? 'prof-1' : 'student-1',
      senderName: this.userRole() === 'profesor' ? 'Prof. María González' : 'Tú',
      senderRole: this.userRole(),
      content: text,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Agregar mensaje a la conversación
    this.conversations.update(convs =>
      convs.map(conv => {
        if (conv.id === this.selectedConversation()!.id) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: text,
            lastMessageTime: newMessage.timestamp,
            unreadCount: this.userRole() === 'profesor' ? conv.unreadCount : 0
          };
        }
        return conv;
      })
    );

    // Actualizar conversación seleccionada
    const updated = this.conversations().find(c => c.id === this.selectedConversation()!.id);
    if (updated) {
      this.selectedConversation.set(updated);
    }

    this.newMessageText.set('');
    this.isSending.set(false);

    // Simular respuesta automática (opcional, solo para demo)
    // setTimeout(() => this.simulateAutoReply(), 2000);
  }

  sortedConversations = computed(() => {
    return [...this.conversations()].sort((a, b) => {
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  });

  unreadTotal = computed(() => {
    return this.conversations().reduce((sum, conv) => sum + conv.unreadCount, 0);
  });

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  isToday(timestamp: string): boolean {
    const date = new Date(timestamp);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  formatMessageDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  }
}
