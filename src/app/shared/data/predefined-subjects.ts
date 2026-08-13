import { type CourseCoverSubject } from '../utils/course-cover';

export type SchoolLevel = 'inicial' | 'primaria' | 'secundaria';

export interface PredefinedSubject {
  id: string;
  name: string;
  codePrefix: string;
  color: string;
  coverKey: CourseCoverSubject;
  levels: SchoolLevel[];
}

/** Materias del plan de estudios SML, alineadas al CNEB. */
export const PREDEFINED_SUBJECTS: PredefinedSubject[] = [
  {
    id: 'comunicacion',
    name: 'Comunicación',
    codePrefix: 'COM',
    color: '#c41e3a',
    coverKey: 'comunicacion',
    levels: ['inicial', 'primaria', 'secundaria'],
  },
  {
    id: 'matematicas',
    name: 'Matemática',
    codePrefix: 'MAT',
    color: '#003366',
    coverKey: 'matematicas',
    levels: ['inicial', 'primaria', 'secundaria'],
  },
  {
    id: 'ciencia',
    name: 'Ciencia y Tecnología',
    codePrefix: 'CYT',
    color: '#1a5a8a',
    coverKey: 'ciencia',
    levels: ['inicial', 'primaria', 'secundaria'],
  },
  {
    id: 'personal-social',
    name: 'Personal Social',
    codePrefix: 'PSO',
    color: '#3d5a80',
    coverKey: 'tutoria',
    levels: ['inicial', 'primaria'],
  },
  {
    id: 'psicomotriz',
    name: 'Psicomotriz',
    codePrefix: 'PSI',
    color: '#1a6b4a',
    coverKey: 'educacion-fisica',
    levels: ['inicial'],
  },
  {
    id: 'religion',
    name: 'Educación Religiosa',
    codePrefix: 'REL',
    color: '#6b4c9a',
    coverKey: 'religion',
    levels: ['inicial', 'primaria', 'secundaria'],
  },
  {
    id: 'educacion-fisica',
    name: 'Educación Física',
    codePrefix: 'EDF',
    color: '#1a6b4a',
    coverKey: 'educacion-fisica',
    levels: ['primaria', 'secundaria'],
  },
  {
    id: 'arte',
    name: 'Arte y Cultura',
    codePrefix: 'ART',
    color: '#9a3d5c',
    coverKey: 'arte',
    levels: ['primaria', 'secundaria'],
  },
  {
    id: 'ingles',
    name: 'Inglés',
    codePrefix: 'ING',
    color: '#2a6b9a',
    coverKey: 'ingles',
    levels: ['primaria', 'secundaria'],
  },
  {
    id: 'computacion',
    name: 'Computación',
    codePrefix: 'INF',
    color: '#0d4a6b',
    coverKey: 'computacion',
    levels: ['primaria', 'secundaria'],
  },
  {
    id: 'tutoria',
    name: 'Tutoría',
    codePrefix: 'TUT',
    color: '#4a5568',
    coverKey: 'tutoria',
    levels: ['primaria', 'secundaria'],
  },
  {
    id: 'ciencias-sociales',
    name: 'Ciencias Sociales',
    codePrefix: 'CSO',
    color: '#8b5a2b',
    coverKey: 'historia',
    levels: ['secundaria'],
  },
  {
    id: 'dpcc',
    name: 'Desarrollo Personal, Ciudadanía y Cívica',
    codePrefix: 'DPC',
    color: '#3d4a6b',
    coverKey: 'tutoria',
    levels: ['secundaria'],
  },
  {
    id: 'ept',
    name: 'Educación para el Trabajo',
    codePrefix: 'EPT',
    color: '#5c4a3a',
    coverKey: 'computacion',
    levels: ['secundaria'],
  },
];

export function subjectsForLevel(level: string): PredefinedSubject[] {
  const key = level as SchoolLevel;
  return PREDEFINED_SUBJECTS.filter(s => s.levels.includes(key));
}

export function findSubjectByName(name: string): PredefinedSubject | undefined {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return undefined;
  return PREDEFINED_SUBJECTS.find(s => s.name.toLowerCase() === n);
}

export function findSubjectById(id: string): PredefinedSubject | undefined {
  return PREDEFINED_SUBJECTS.find(s => s.id === id);
}

export function subjectCoverUrl(subject: PredefinedSubject): string {
  return `/images/courses/${subject.coverKey}.webp`;
}

export function gradeCodeSuffix(grade: string): string {
  const g = (grade ?? '').trim();
  if (/años/i.test(g)) return `${g.charAt(0)}A`;
  const n = g.match(/\d/)?.[0] ?? '';
  if (/primaria/i.test(g)) return `${n}P`;
  if (/secundaria/i.test(g)) return `${n}S`;
  return n || 'XX';
}

export function buildCourseCode(prefix: string, grade: string): string {
  return `${prefix}-${gradeCodeSuffix(grade)}`;
}
