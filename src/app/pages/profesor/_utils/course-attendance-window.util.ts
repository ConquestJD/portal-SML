/** Orden JS: 0 = domingo … 6 = sábado (coherente con horario en español del formulario de curso). */
const WEEKDAY_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

export type CourseScheduleSlot = { day?: string; startTime?: string; endTime?: string };

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function weekdayKeyFromDate(d: Date): string {
  return stripAccents(WEEKDAY_ES[d.getDay()]);
}

function normalizeSlotDay(day: string | undefined): string {
  return stripAccents((day ?? '').trim());
}

function timeToMinutes(t: string | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(x => parseInt(x, 10));
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** Devuelve el bloque horario activo ahora (mismo día y hora local dentro de [start, end]). */
export function findActiveScheduleSlot(
  schedule: CourseScheduleSlot[] | null | undefined,
  at: Date
): CourseScheduleSlot | null {
  if (!schedule?.length) return null;
  const todayKey = weekdayKeyFromDate(at);
  const nowMin = at.getHours() * 60 + at.getMinutes();
  for (const slot of schedule) {
    const dk = normalizeSlotDay(slot.day);
    if (dk !== todayKey) continue;
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    if (end < start) continue;
    if (nowMin >= start && nowMin <= end) return slot;
  }
  return null;
}

export function isAttendanceWindowOpen(
  schedule: CourseScheduleSlot[] | null | undefined,
  at: Date
): boolean {
  if (!schedule?.length) return true;
  return findActiveScheduleSlot(schedule, at) != null;
}

/** Texto útil para la UI (“Lunes 10:00–12:00, Martes …”). */
export function formatScheduleSummary(schedule: CourseScheduleSlot[] | null | undefined): string {
  if (!schedule?.length) return 'Sin horario definido en el curso.';
  return schedule
    .map(s => `${s.day ?? '—'} ${s.startTime ?? ''}–${s.endTime ?? ''}`.trim())
    .join(' · ');
}
