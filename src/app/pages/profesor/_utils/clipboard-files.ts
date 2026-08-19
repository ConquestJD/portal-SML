/** Archivos pegados desde el portapapeles (Explorador o captura). */
export function filesFromClipboard(event: ClipboardEvent): File[] {
  const dt = event.clipboardData;
  if (!dt) return [];
  const listed = Array.from(dt.files ?? []);
  if (listed.length) return listed;
  const out: File[] = [];
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) out.push(file);
  }
  return out;
}
