import { Component, computed, input } from '@angular/core';
import { encodeCode128B } from '../../utils/code128';

@Component({
  selector: 'app-barcode128',
  standalone: true,
  template: `
    @if (viewBox()) {
      <svg
        class="barcode128"
        [attr.viewBox]="viewBox()"
        [attr.width]="svgWidth()"
        [attr.height]="height()"
        role="img"
        [attr.aria-label]="value()"
      >
        @for (bar of bars(); track $index) {
          <rect [attr.x]="bar.x" y="0" [attr.width]="bar.w" [attr.height]="height()" />
        }
      </svg>
    }
  `,
  styles: [`
    :host { display: block; line-height: 0; }
    .barcode128 { display: block; width: 100%; height: auto; fill: #111; }
  `],
})
export class Barcode128Component {
  value = input.required<string>();
  height = input(44);
  moduleWidth = input(2);

  private encoded = computed(() => {
    const text = (this.value() ?? '').trim();
    if (!text) return [];
    try {
      return encodeCode128B(text);
    } catch {
      return [];
    }
  });

  bars = computed(() => {
    const modules = this.encoded();
    const mw = this.moduleWidth();
    const quiet = 10;
    const rects: { x: number; w: number }[] = [];
    let x = quiet * mw;
    let run = 0;
    for (let i = 0; i <= modules.length; i++) {
      if (modules[i] === 1) {
        run += 1;
      } else if (run) {
        rects.push({ x: x - run * mw, w: run * mw });
        run = 0;
      }
      x += mw;
    }
    return rects;
  });

  svgWidth = computed(() => {
    const n = this.encoded().length;
    if (!n) return 0;
    return (n + 20) * this.moduleWidth();
  });

  viewBox = computed(() => {
    const w = this.svgWidth();
    return w ? `0 0 ${w} ${this.height()}` : '';
  });
}
