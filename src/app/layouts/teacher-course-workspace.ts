/** Aula abierta: curso (y pantallas hijas) o ficha de tarea del estudiante. */
export function isTeacherCourseWorkspaceUrl(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return (
    /^\/profesor\/cursos\/[^/]+/.test(path) ||
    /^\/cursos\/[^/]+/.test(path) ||
    /^\/tareas\/[^/]+/.test(path)
  );
}
