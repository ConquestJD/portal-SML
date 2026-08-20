export type FolderContentKind = 'file' | 'link' | 'text';

export interface ParsedMaterialNote {
  kind: 'link' | 'text';
  title: string;
  url?: string;
  body?: string;
}

export interface FolderContentEntry {
  id: string;
  kind: FolderContentKind;
  title: string;
  createdAt: number;
  fileId?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  body?: string;
}

/** `Enlace: nombre — url` tal como lo guarda el docente al publicar. */
const LINK_LINE = /^Enlace:\s*(.+?)\s+[—–-]\s+(\S+)\s*$/i;

export function parseMaterialNotes(description?: string | null): ParsedMaterialNote[] {
  const raw = (description ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];

  const links: ParsedMaterialNote[] = [];
  const textLines: string[] = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const match = t.match(LINK_LINE);
    if (match) {
      links.push({
        kind: 'link',
        title: match[1].trim() || 'Enlace',
        url: match[2].trim(),
      });
    } else {
      textLines.push(t);
    }
  }

  const notes: ParsedMaterialNote[] = [];
  if (textLines.length) {
    notes.push({ kind: 'text', title: 'Nota', body: textLines.join('\n') });
  }
  return [...notes, ...links];
}

export function toTimestamp(value?: string | Date | number | null): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function buildFolderContents(input: {
  materialId: string;
  description?: string | null;
  createdAt?: string | Date | null;
  files: Array<{
    id: string;
    name: string;
    mimeType?: string;
    size?: number;
    createdAt?: string | Date | null;
  }>;
}): FolderContentEntry[] {
  const base = toTimestamp(input.createdAt);
  const notes = parseMaterialNotes(input.description).map((n, i) => ({
    id: `${input.materialId}-note-${i}`,
    kind: n.kind as FolderContentKind,
    title: n.title,
    createdAt: base,
    url: n.url,
    body: n.body,
  }));
  const files = (input.files ?? []).map((f, i) => ({
    id: f.id || `${input.materialId}-file-${i}`,
    kind: 'file' as const,
    title: f.name,
    createdAt: toTimestamp(f.createdAt) || base,
    fileId: f.id,
    mimeType: f.mimeType,
    size: f.size,
  }));
  const rank: Record<FolderContentKind, number> = { text: 0, link: 1, file: 2 };
  return [...notes, ...files].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return rank[a.kind] - rank[b.kind];
  });
}

export function folderContentCountLabel(entries: FolderContentEntry[]): string {
  if (!entries.length) return 'Vacío';
  const files = entries.filter((e) => e.kind === 'file').length;
  const texts = entries.filter((e) => e.kind === 'text').length;
  const links = entries.filter((e) => e.kind === 'link').length;
  const parts: string[] = [];
  if (files) parts.push(`${files} ${files === 1 ? 'archivo' : 'archivos'}`);
  if (texts) parts.push(`${texts} ${texts === 1 ? 'texto' : 'textos'}`);
  if (links) parts.push(`${links} ${links === 1 ? 'enlace' : 'enlaces'}`);
  return parts.join(' · ');
}

export function isSafeHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
