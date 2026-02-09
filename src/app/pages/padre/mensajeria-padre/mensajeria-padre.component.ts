import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Child {
  id: string;
  name: string;
  grade: string;
  section: string;
  photo?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'profesor' | 'tutor' | 'coordinador' | 'padre';
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
  participantRole: 'profesor' | 'tutor' | 'coordinador';
  participantAvatar?: string;
  participantTitle?: string; // Ej: "Tutor de Sección", "Prof. de Matemática"
  childId: string;
  childName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

@Component({
  selector: 'app-mensajeria-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mensajeria-padre.component.html',
  styleUrl: './mensajeria-padre.component.css'
})
export class MensajeriaPadreComponent implements OnInit {
  selectedChildId = signal<string>('');
  isLoading = signal(true);
  
  children = signal<Child[]>([
    { 
      id: '1', 
      name: 'María Rodríguez', 
      grade: '3ro', 
      section: 'A',
      photo: 'https://via.placeholder.com/60'
    },
    { 
      id: '2', 
      name: 'Pedro Rodríguez', 
      grade: '1ro', 
      section: 'B',
      photo: 'https://via.placeholder.com/60'
    }
  ]);

  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  newMessageText = signal('');
  isSending = signal(false);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer query params
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      } else if (this.children().length > 0) {
        this.selectedChildId.set(this.children()[0].id);
      }

      // Si hay teacherId, cargar conversaciones y seleccionar esa conversación
      if (params['teacherId']) {
        this.loadConversations().then(() => {
          this.selectConversationByTeacherId(params['teacherId'], params['courseId']);
        });
      } else {
        this.loadConversations();
      }
    });
  }

  loadConversations(): Promise<void> {
    this.isLoading.set(true);
    
    return new Promise((resolve) => {
      setTimeout(() => {
      // Conversaciones para María (3ro A)
      const mariaConversations: Conversation[] = [
        {
          id: 'conv1',
          participantId: 'prof1',
          participantName: 'Prof. Ana Martínez',
          participantRole: 'profesor',
          participantTitle: 'Prof. de Matemática',
          participantAvatar: 'https://via.placeholder.com/40',
          childId: '1',
          childName: 'María Rodríguez',
          lastMessage: 'Gracias por su consulta, le responderé pronto.',
          lastMessageTime: '2024-04-20T10:30:00Z',
          unreadCount: 0,
          messages: [
            { 
              id: 'msg1', 
              senderId: 'parent1', 
              senderName: 'Padre/Madre', 
              senderRole: 'padre', 
              content: 'Buenos días, quería consultar sobre el rendimiento de mi hija en matemática.', 
              timestamp: '2024-04-20T09:00:00Z', 
              read: true 
            },
            { 
              id: 'msg2', 
              senderId: 'prof1', 
              senderName: 'Prof. Ana Martínez', 
              senderRole: 'profesor', 
              content: 'Gracias por su consulta, le responderé pronto.', 
              timestamp: '2024-04-20T10:30:00Z', 
              read: true 
            }
          ]
        },
        {
          id: 'conv2',
          participantId: 'tutor1',
          participantName: 'Prof. Carlos López',
          participantRole: 'tutor',
          participantTitle: 'Tutor de Sección',
          participantAvatar: 'https://via.placeholder.com/40',
          childId: '1',
          childName: 'María Rodríguez',
          lastMessage: 'La reunión de padres será el próximo viernes.',
          lastMessageTime: '2024-04-19T15:00:00Z',
          unreadCount: 1,
          messages: [
            { 
              id: 'msg3', 
              senderId: 'tutor1', 
              senderName: 'Prof. Carlos López', 
              senderRole: 'tutor', 
              content: 'La reunión de padres será el próximo viernes.', 
              timestamp: '2024-04-19T15:00:00Z', 
              read: false 
            }
          ]
        }
      ];

      // Conversaciones para Pedro (1ro B)
      const pedroConversations: Conversation[] = [
        {
          id: 'conv3',
          participantId: 'prof2',
          participantName: 'Prof. Juan Pérez',
          participantRole: 'profesor',
          participantTitle: 'Prof. de Matemática',
          participantAvatar: 'https://via.placeholder.com/40',
          childId: '2',
          childName: 'Pedro Rodríguez',
          lastMessage: 'Pedro está mejorando mucho en la materia.',
          lastMessageTime: '2024-04-18T14:00:00Z',
          unreadCount: 0,
          messages: [
            { 
              id: 'msg4', 
              senderId: 'parent1', 
              senderName: 'Padre/Madre', 
              senderRole: 'padre', 
              content: '¿Cómo va el progreso de mi hijo?', 
              timestamp: '2024-04-18T10:00:00Z', 
              read: true 
            },
            { 
              id: 'msg5', 
              senderId: 'prof2', 
              senderName: 'Prof. Juan Pérez', 
              senderRole: 'profesor', 
              content: 'Pedro está mejorando mucho en la materia.', 
              timestamp: '2024-04-18T14:00:00Z', 
              read: true 
            }
          ]
        },
        {
          id: 'conv4',
          participantId: 'coord1',
          participantName: 'Lic. Carlos López',
          participantRole: 'coordinador',
          participantTitle: 'Coordinador Académico',
          participantAvatar: 'https://via.placeholder.com/40',
          childId: '2',
          childName: 'Pedro Rodríguez',
          lastMessage: 'Gracias por contactarnos.',
          lastMessageTime: '2024-04-17T11:00:00Z',
          unreadCount: 0,
          messages: [
            { 
              id: 'msg6', 
              senderId: 'coord1', 
              senderName: 'Lic. Carlos López', 
              senderRole: 'coordinador', 
              content: 'Gracias por contactarnos.', 
              timestamp: '2024-04-17T11:00:00Z', 
              read: true 
            }
          ]
        }
      ];

      this.conversations.set([...mariaConversations, ...pedroConversations]);
      
      // Seleccionar primera conversación del hijo seleccionado si existe (solo si no hay teacherId en params)
      if (this.selectedChildId()) {
        const params = this.route.snapshot.queryParams;
        if (!params['teacherId']) {
          const firstConv = this.conversations().find(c => c.childId === this.selectedChildId());
          if (firstConv) {
            this.selectConversation(firstConv);
          }
        }
      }
      
      this.isLoading.set(false);
      resolve();
    }, 500);
    });
  }

  selectConversationByTeacherId(teacherId: string, courseId?: string) {
    // Buscar conversación existente con ese profesor para el hijo seleccionado
    let conversation = this.conversations().find(
      c => c.participantId === teacherId && c.childId === this.selectedChildId()
    );

    // Si no existe, crear una nueva conversación
    if (!conversation) {
      const teacher = this.getTeacherInfo(teacherId, courseId);
      if (teacher) {
        const newConversation: Conversation = {
          id: `conv-${teacherId}-${this.selectedChildId()}`,
          participantId: teacherId,
          participantName: teacher.name,
          participantRole: 'profesor',
          participantTitle: teacher.title,
          participantAvatar: teacher.avatar,
          childId: this.selectedChildId(),
          childName: this.selectedChild()?.name || '',
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          messages: []
        };
        
        // Agregar la nueva conversación
        this.conversations.update(convs => [...convs, newConversation]);
        conversation = newConversation;
      }
    }

    if (conversation) {
      this.selectConversation(conversation);
    }
  }

  getTeacherInfo(teacherId: string, courseId?: string): { name: string; title: string; avatar?: string } | null {
    // Mapeo de profesores (en producción esto vendría de una API)
    const teachers: Record<string, { name: string; title: string; avatar?: string }> = {
      'prof1': { 
        name: 'Prof. Ana Martínez', 
        title: 'Prof. de Matemática',
        avatar: 'https://via.placeholder.com/40'
      },
      'prof2': { 
        name: 'Prof. Juan Pérez', 
        title: 'Prof. de Matemática',
        avatar: 'https://via.placeholder.com/40'
      }
    };

    return teachers[teacherId] || null;
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
    // Seleccionar primera conversación del nuevo hijo si existe
    const firstConv = this.conversations().find(c => c.childId === childId);
    if (firstConv) {
      this.selectConversation(firstConv);
    } else {
      this.selectedConversation.set(null);
    }
  }

  selectedChild = computed(() => {
    return this.children().find(c => c.id === this.selectedChildId());
  });

  filteredConversations = computed(() => {
    if (!this.selectedChildId()) return [];
    return this.conversations().filter(c => c.childId === this.selectedChildId());
  });

  selectConversation(conversation: Conversation) {
    this.selectedConversation.set(conversation);
    this.markMessagesAsRead(conversation.id);
  }

  markMessagesAsRead(conversationId: string) {
    this.conversations.update(convs =>
      convs.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0, messages: conv.messages.map(msg => ({ ...msg, read: true })) }
          : conv
      )
    );
  }

  sendMessage() {
    if (this.newMessageText().trim() === '' || !this.selectedConversation()) {
      return;
    }

    this.isSending.set(true);
    const currentConversation = this.selectedConversation();
    if (!currentConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'parent1',
      senderName: 'Padre/Madre',
      senderRole: 'padre',
      content: this.newMessageText(),
      timestamp: new Date().toISOString(),
      read: false
    };

    setTimeout(() => {
      this.conversations.update(convs =>
        convs.map(conv =>
          conv.id === currentConversation.id
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                lastMessage: newMessage.content,
                lastMessageTime: newMessage.timestamp,
                unreadCount: conv.unreadCount + 1
              }
            : conv
        )
      );
      this.selectedConversation.update(conv => conv ? { ...conv, messages: [...conv.messages, newMessage] } : null);
      this.newMessageText.set('');
      this.isSending.set(false);
      
      // Scroll to bottom of messages
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-list');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }, 500);
  }

  getParticipantInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      // Formatear fecha manualmente
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } else if (days > 0) {
      return `${days} día${days > 1 ? 's' : ''} atrás`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    } else if (minutes > 0) {
      return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    } else {
      return 'Ahora';
    }
  }

  totalUnreadCount = computed(() => {
    return this.filteredConversations().reduce((sum, conv) => sum + conv.unreadCount, 0);
  });

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
