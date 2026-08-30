import { Component, input } from '@angular/core';
import { Barcode128Component } from '../../../shared/components/barcode128/barcode128.component';

@Component({
  selector: 'app-carnet-face',
  standalone: true,
  imports: [Barcode128Component],
  template: `
    <article class="face">
      <header class="face__head">
        <img class="face__crest" src="/only-logo.png" alt="" />
        <div>
          <p class="face__brand">Santa María Laura</p>
          <p class="face__kind">Carnet de estudiante</p>
        </div>
      </header>
      <div class="face__body">
        <div class="face__who">
          <p class="face__name">{{ fullName() }}</p>
          @if (gradeLine()) {
            <p class="face__grade">{{ gradeLine() }}</p>
          }
        </div>
        <div class="face__photo">
          @if (photoUrl()) {
            <img [src]="photoUrl()!" [alt]="fullName()" />
          }
        </div>
      </div>
      <footer class="face__code">
        @if (code()) {
          <app-barcode128 [value]="code()" [height]="32" [moduleWidth]="1.4" />
          <p>{{ code() }}</p>
        }
      </footer>
    </article>
  `,
  styles: [`
    :host { display: block; }
    .face {
      width: 85.6mm;
      height: 54mm;
      padding: 3.6mm 4.6mm 2.8mm;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 2mm;
      overflow: hidden;
      background: #fff;
      color: #142033;
      border: 0.35mm solid #003366;
      box-shadow: 0 10px 28px rgba(0 21 40 / .12);
    }
    .face__head {
      display: flex;
      align-items: center;
      gap: 3mm;
      padding-bottom: 2mm;
      border-bottom: 0.45mm solid #c41e3a;
    }
    .face__crest { width: 8.5mm; height: 8.5mm; object-fit: contain; }
    .face__brand {
      margin: 0;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #003366;
    }
    .face__kind {
      margin: .4mm 0 0;
      font-size: 6.5pt;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: #5c6b7e;
    }
    .face__body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 3.2mm;
      min-height: 0;
      overflow: hidden;
    }
    .face__who { min-width: 0; }
    .face__photo {
      width: 18mm;
      height: 22mm;
      max-height: 100%;
      align-self: center;
      background: #eef1f5;
      overflow: hidden;
    }
    .face__photo img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
    .face__name {
      margin: 0;
      font-family: 'Newsreader', Georgia, serif;
      font-size: 12pt;
      font-weight: 600;
      line-height: 1.15;
      color: #003366;
    }
    .face__grade { margin: 1.2mm 0 0; font-size: 8pt; color: #5c6b7e; }
    .face__code {
      min-width: 0;
      padding-top: 1.6mm;
      border-top: 0.25mm solid rgba(0 51 102 / .16);
      text-align: center;
    }
    .face__code app-barcode128 {
      display: block;
      max-height: 9mm;
      overflow: hidden;
    }
    .face__code p {
      margin: 1mm 0 0;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: .16em;
      color: #003366;
    }
  `],
})
export class CarnetFaceComponent {
  fullName = input.required<string>();
  code = input.required<string>();
  gradeLine = input('');
  photoUrl = input<string | null | undefined>(null);
}
