const STORAGE_KEY = 'sml.gate.reader';

export interface GateReaderInfo {
  label: string;
  vendorId: number;
  productId: number;
  serialNumber: string;
}

type UsbNav = {
  getDevices: () => Promise<UsbDev[]>;
  requestDevice: (opts: { filters: Array<{ vendorId?: number }> }) => Promise<UsbDev>;
  addEventListener: (type: 'connect' | 'disconnect', fn: (ev: { device: UsbDev }) => void) => void;
  removeEventListener: (type: 'connect' | 'disconnect', fn: (ev: { device: UsbDev }) => void) => void;
};

type HidNav = {
  getDevices: () => Promise<HidDev[]>;
  requestDevice: (opts: { filters: Array<{ vendorId?: number }> }) => Promise<HidDev[]>;
  addEventListener: (type: 'connect' | 'disconnect', fn: (ev: { device: HidDev }) => void) => void;
  removeEventListener: (type: 'connect' | 'disconnect', fn: (ev: { device: HidDev }) => void) => void;
};

interface UsbDev {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
}

interface HidDev {
  vendorId: number;
  productId: number;
  productName?: string;
}

const SCANNER_VIDS = [
  0x1b55, // ZKTeco
  0x0acd, 0x05e0, 0x0c2e, 0x0536, 0x04b4, 0x23d0, 0x1a86,
];

function usb(): UsbNav | null {
  const n = navigator as Navigator & { usb?: UsbNav };
  return n.usb ?? null;
}

function hid(): HidNav | null {
  const n = navigator as Navigator & { hid?: HidNav };
  return n.hid ?? null;
}

function labelOf(d: { productName?: string; manufacturerName?: string; vendorId: number; productId: number }): string {
  const name = (d.productName || '').trim();
  if (name) return name;
  const maker = (d.manufacturerName || '').trim();
  if (maker) return maker;
  return `Lector ${d.vendorId.toString(16)}:${d.productId.toString(16)}`;
}

function looksLikeScanner(d: { productName?: string; manufacturerName?: string; vendorId: number }): boolean {
  const text = `${d.productName ?? ''} ${d.manufacturerName ?? ''}`.toLowerCase();
  if (/zkteco|zkb|scanner|barcode|lector|honeywell|zebra|symbol|datalogic/.test(text)) return true;
  return SCANNER_VIDS.includes(d.vendorId);
}

function remember(info: GateReaderInfo) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
}

function remembered(): GateReaderInfo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GateReaderInfo;
  } catch {
    return null;
  }
}

export class GateReaderWatch {
  info: GateReaderInfo | null = null;
  ready = false;
  supported = !!(usb() || hid());

  private onUsb?: (ev: { device: UsbDev }) => void;
  private onHid?: (ev: { device: HidDev }) => void;
  private change: (ready: boolean, info: GateReaderInfo | null) => void = () => {};

  start(change: (ready: boolean, info: GateReaderInfo | null) => void) {
    this.change = change;
    const u = usb();
    const h = hid();
    this.onUsb = () => {
      void this.refresh();
    };
    this.onHid = () => {
      void this.refresh();
    };
    u?.addEventListener('connect', this.onUsb);
    u?.addEventListener('disconnect', this.onUsb);
    h?.addEventListener('connect', this.onHid);
    h?.addEventListener('disconnect', this.onHid);
    void this.refresh();
  }

  stop() {
    const u = usb();
    const h = hid();
    if (this.onUsb) {
      u?.removeEventListener('connect', this.onUsb);
      u?.removeEventListener('disconnect', this.onUsb);
    }
    if (this.onHid) {
      h?.removeEventListener('connect', this.onHid);
      h?.removeEventListener('disconnect', this.onHid);
    }
  }

  async pair(): Promise<void> {
    const u = usb();
    const h = hid();
    if (u) {
      const device = await u.requestDevice({ filters: [] });
      const info: GateReaderInfo = {
        label: labelOf(device),
        vendorId: device.vendorId,
        productId: device.productId,
        serialNumber: device.serialNumber ?? '',
      };
      remember(info);
      this.setReady(true, info);
      return;
    }
    if (h) {
      const devices = await h.requestDevice({
        filters: SCANNER_VIDS.map((vendorId) => ({ vendorId })),
      });
      const device = devices[0];
      if (!device) throw new Error('No se eligió un lector');
      const info: GateReaderInfo = {
        label: labelOf(device),
        vendorId: device.vendorId,
        productId: device.productId,
        serialNumber: '',
      };
      remember(info);
      this.setReady(true, info);
      return;
    }
    throw new Error('Este navegador no puede detectar el lector. Usa Chrome.');
  }

  private async refresh() {
    const saved = remembered();
    const usbDevices = (await usb()?.getDevices().catch((): UsbDev[] => [])) ?? [];
    const hidDevices = (await hid()?.getDevices().catch((): HidDev[] => [])) ?? [];

    const match =
      usbDevices.find((d) => this.matchesSaved(d, saved) || looksLikeScanner(d)) ??
      hidDevices.find((d) => this.matchesSaved(d, saved) || looksLikeScanner(d));

    if (!match) {
      this.setReady(false, saved);
      return;
    }
    const info: GateReaderInfo = {
      label: labelOf(match),
      vendorId: match.vendorId,
      productId: match.productId,
      serialNumber: 'serialNumber' in match ? (match.serialNumber ?? '') : '',
    };
    remember(info);
    this.setReady(true, info);
  }

  private matchesSaved(
    d: { vendorId: number; productId: number; serialNumber?: string },
    saved: GateReaderInfo | null,
  ): boolean {
    if (!saved) return false;
    if (d.vendorId !== saved.vendorId || d.productId !== saved.productId) return false;
    if (saved.serialNumber && d.serialNumber && d.serialNumber !== saved.serialNumber) return false;
    return true;
  }

  private setReady(ready: boolean, info: GateReaderInfo | null) {
    this.ready = ready;
    this.info = info;
    this.change(ready, info);
  }
}

