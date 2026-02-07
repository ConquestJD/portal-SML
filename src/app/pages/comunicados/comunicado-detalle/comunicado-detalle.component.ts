import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface AnnouncementDetail {
  id: string;
  title: string;
  content: string;
  fullContent: string;
  type: 'institucional' | 'grado' | 'seccion';
  priority: 'urgente' | 'importante' | 'normal';
  date: string;
  publishedAt: string;
  read: boolean;
  author: {
    name: string;
    role: string;
    photo?: string;
  };
  recipients?: {
    grade?: string;
    section?: string;
    specific?: string[];
  };
  attachments: Attachment[];
  readDeadline?: string;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
}

@Component({
  selector: 'app-comunicado-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './comunicado-detalle.component.html',
  styleUrl: './comunicado-detalle.component.css'
})
export class ComunicadoDetalleComponent implements OnInit {
  comunicadoId = signal<string>('');
  comunicado = signal<AnnouncementDetail | null>(null);
  isLoading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.comunicadoId.set(params['id']);
      this.loadComunicado();
    });
  }

  loadComunicado() {
    this.isLoading.set(true);
    
    // Simulación de carga de datos - en producción esto vendría de un servicio
    setTimeout(() => {
      const mockComunicado: AnnouncementDetail = {
        id: this.comunicadoId(),
        title: 'Reunión de Padres - Marzo 2024',
        content: 'Se convoca a todos los padres de familia a la reunión del mes de marzo...',
        fullContent: `
          <p>Estimados padres de familia y tutores,</p>
          
          <p>Nos dirigimos a ustedes para convocarlos a la <strong>Reunión de Padres del mes de marzo 2024</strong>, que se llevará a cabo el día <strong>25 de marzo de 2024</strong> a las <strong>6:00 PM</strong> en el auditorio principal de la institución.</p>
          
          <h3>Agenda de la Reunión:</h3>
          <ul>
            <li>Presentación de logros académicos del primer trimestre</li>
            <li>Información sobre actividades programadas para el segundo trimestre</li>
            <li>Revisión del calendario académico</li>
            <li>Espacio para preguntas y respuestas</li>
          </ul>
          
          <p>Es importante su asistencia ya que se tratarán temas relevantes para el desarrollo académico de sus hijos. Al finalizar la reunión, se entregará material informativo sobre las próximas actividades.</p>
          
          <p>Por favor, confirmen su asistencia antes del 20 de marzo a través del portal estudiantil o comunicándose con la secretaría.</p>
          
          <p>Quedamos atentos a cualquier consulta.</p>
          
          <p>Atentamente,<br>
          <strong>Dirección Académica</strong><br>
          Colegio Santa María Laura</p>
        `,
        type: 'institucional',
        priority: 'importante',
        date: '2024-03-10',
        publishedAt: '2024-03-10T08:30:00',
        read: false,
        author: {
          name: 'Prof. María González',
          role: 'Directora Académica',
          photo: 'https://via.placeholder.com/50'
        },
        recipients: {
          grade: 'Todos los grados',
          section: 'Todas las secciones'
        },
        attachments: [
          {
            id: '1',
            name: 'Agenda_Reunion_Marzo_2024.pdf',
            type: 'PDF',
            size: '1.2 MB',
            url: '#'
          },
          {
            id: '2',
            name: 'Calendario_Academico_2024.pdf',
            type: 'PDF',
            size: '850 KB',
            url: '#'
          }
        ],
        readDeadline: '2024-03-20'
      };

      this.comunicado.set(mockComunicado);
      this.isLoading.set(false);
    }, 500);
  }

  markAsRead() {
    if (this.comunicado()) {
      const updated = { ...this.comunicado()! };
      updated.read = true;
      this.comunicado.set(updated);
      
      // En producción, esto actualizaría el estado en el servidor
      // this.comunicadosService.markAsRead(this.comunicadoId());
    }
  }

  downloadAttachment(attachment: Attachment) {
    // Simulación de descarga
    console.log('Descargando:', attachment.name);
    // En producción, esto descargaría el archivo real
  }

  downloadAllAttachments() {
    const attachments = this.comunicado()?.attachments;
    if (attachments && attachments.length > 0) {
      attachments.forEach(attachment => {
        this.downloadAttachment(attachment);
      });
    }
  }

  goBack() {
    this.router.navigate(['/comunicados']);
  }
}
