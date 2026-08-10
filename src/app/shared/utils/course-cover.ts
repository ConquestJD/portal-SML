/** Portadas locales por materia — fallback editorial cuando no hay imageUrl. */

const SUBJECT_COVERS = [
  {
    key: 'matematicas',
    match: /\b(mate(m[aá]tica)?s?|algebra|geometr[ií]a|aritm[eé]tica|n[uú]meros?)\b/i,
  },
  {
    key: 'educacion-fisica',
    match: /\b(educaci[oó]n\s*f[ií]sica|\bef\b|deporte|gimnasia|educaci[oó]n\s*fisica)\b/i,
  },
  {
    key: 'comunicacion',
    match: /\b(comunicaci[oó]n|lenguaje|literatura|castellano|lectura|escritura|lengua)\b/i,
  },
  {
    key: 'ciencia',
    match: /\b(ciencia|tecnolog[ií]a|biolog[ií]a|f[ií]sica|qu[ií]mica|\bcta\b|experimental|naturales)\b/i,
  },
  {
    key: 'historia',
    match: /\b(historia|sociales|geograf[ií]a|c[ií]vica|ciudadan[ií]a|econom[ií]a|cc\s*ss)\b/i,
  },
  {
    key: 'ingles',
    match: /\b(ingl[eé]s|english|idioma)\b/i,
  },
  {
    key: 'arte',
    match: /\b(arte|art[ií]stica|dibujo|pintura|visual|teatro)\b/i,
  },
  {
    key: 'religion',
    match: /\b(religi[oó]n|fe|pastoral|catequesis)\b/i,
  },
  {
    key: 'computacion',
    match: /\b(computaci[oó]n|inform[aá]tica|programaci[oó]n|\btic\b|digital|rob[oó]tica)\b/i,
  },
  {
    key: 'musica',
    match: /\b(m[uú]sica|coral|canto|orquesta)\b/i,
  },
  {
    key: 'tutoria',
    match: /\b(tutor[ií]a|personal\s*social|orientaci[oó]n|\bdpcc\b|desarrollo\s*personal)\b/i,
  },
] as const;

export type CourseCoverSubject = (typeof SUBJECT_COVERS)[number]['key'] | 'general';

export function resolveCourseSubject(name?: string | null): CourseCoverSubject {
  const n = (name ?? '').trim();
  if (!n) return 'general';
  for (const s of SUBJECT_COVERS) {
    if (s.match.test(n)) return s.key;
  }
  return 'general';
}

/** Prefer API imageUrl; otherwise subject cover under /images/courses/. */
export function resolveCourseCoverUrl(opts: {
  name?: string | null;
  imageUrl?: string | null;
}): string {
  const custom = opts.imageUrl?.trim();
  if (custom) return custom;
  const subject = resolveCourseSubject(opts.name);
  return `/images/courses/${subject}.webp`;
}

export function courseCoverAlt(name?: string | null): string {
  const n = (name ?? '').trim();
  return n ? `Portada de ${n}` : 'Portada del curso';
}
