/** Fotos de header por tema. El campus (`fondo.webp`) se reserva para dashboards y login. */

export const HERO = {
  campus: '/images/fondo.webp',
  students: '/images/heroes/students.webp',
  teachers: '/images/heroes/teachers.webp',
  parents: '/images/heroes/parents.webp',
  courses: '/images/heroes/courses.webp',
  attendance: '/images/heroes/attendance.webp',
  grades: '/images/heroes/grades.webp',
  tasks: '/images/heroes/tasks.webp',
  announcements: '/images/heroes/announcements.webp',
  messages: '/images/heroes/messages.webp',
  payments: '/images/heroes/payments.webp',
  reports: '/images/heroes/reports.webp',
  profile: '/images/heroes/profile.webp',
  settings: '/images/heroes/settings.webp',
  calendar: '/images/heroes/calendar.webp',
  admin: '/images/heroes/admin.webp',
  classrooms: '/images/heroes/classrooms.webp',
} as const;

export type HeroTheme = keyof typeof HERO;
