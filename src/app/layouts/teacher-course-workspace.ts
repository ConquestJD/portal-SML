/** Aula abierta: curso del profesor o del estudiante (y pantallas hijas). */
export function isTeacherCourseWorkspaceUrl(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return /^\/profesor\/cursos\/[^/]+/.test(path) || /^\/cursos\/[^/]+/.test(path);
}
