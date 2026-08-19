/** Rutas del aula del profesor (curso seleccionado y pantallas hijas). */
export function isTeacherCourseWorkspaceUrl(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return /^\/profesor\/cursos\/[^/]+/.test(path);
}
