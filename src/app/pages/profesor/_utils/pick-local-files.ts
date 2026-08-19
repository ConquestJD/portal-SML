export type PickLocalFilesResult = File[] | 'fallback';

type FilePickerHandle = { getFile: () => Promise<File> };
type ShowOpenFilePicker = (options: {
  id?: string;
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  multiple?: boolean;
}) => Promise<FilePickerHandle[]>;

/**
 * Abre el selector de archivos partiendo de Documentos, no de “Este equipo”
 * (ese listado se cuelga en Windows cuando hay red o unidades lentas).
 */
export async function pickLocalFiles(opts: {
  multiple?: boolean;
  startIn?: 'desktop' | 'documents' | 'downloads' | 'pictures';
} = {}): Promise<PickLocalFilesResult> {
  const show = (window as unknown as { showOpenFilePicker?: ShowOpenFilePicker }).showOpenFilePicker;
  if (typeof show !== 'function') return 'fallback';
  try {
    const handles = await show({
      id: 'portal-sml-upload',
      startIn: opts.startIn ?? 'documents',
      multiple: opts.multiple !== false,
    });
    return Promise.all(handles.map(h => h.getFile()));
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'AbortError') return [];
    return 'fallback';
  }
}
