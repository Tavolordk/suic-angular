import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';

/** Texto institucional común al acceso público (login) y al menú autenticado. */
@Component({
  selector: 'app-terms-dialog',
  standalone: true,
  templateUrl: './terms-dialog.html',
  styleUrl: './terms-dialog.scss'
})
export class TermsDialog implements AfterViewInit, OnDestroy {
  @Output() readonly closed = new EventEmitter<void>();
  @ViewChild('closeButton') private readonly closeButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('dialog') private readonly dialog?: ElementRef<HTMLElement>;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private oldOverflow = '';
  private previouslyFocused: HTMLElement | null = null;
  private printCleanup: (() => void) | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.previouslyFocused = this.document.activeElement as HTMLElement | null;
    this.oldOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.closeButton?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.printCleanup?.();
    this.document.body.style.overflow = this.oldOverflow;
    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus();
    }
  }

  /** Imprime el texto legal completo sin el modal ni la pantalla de fondo. */
  printDocument(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const content = this.dialog?.nativeElement.querySelector<HTMLElement>('.legal-modal__body');
    const printWindow = this.document.defaultView;
    if (!content || !printWindow) {
      return;
    }

    // Evitar iframes de 1 px: Chrome puede calcular la impresión con ese
    // tamaño de viewport y mostrar una única hoja completamente en blanco.
    this.printCleanup?.();

    const printRoot = this.document.createElement('article');
    printRoot.id = 'spm-terms-print-root';
    printRoot.setAttribute('aria-hidden', 'true');
    printRoot.innerHTML = `<header class="spm-print-heading">
      <span>SISTEMA PLATAFORMA MÉXICO · SPM-1.0</span>
      <h1>Términos y condiciones de uso</h1>
    </header>`;

    const printMain = this.document.createElement('main');
    // Clonar los nueve apartados existentes: no mantener una segunda versión
    // del texto legal y no depender del scroll ni la altura del diálogo.
    printMain.appendChild(content.cloneNode(true));
    printRoot.appendChild(printMain);
    const printFooter = this.document.createElement('footer');
    printFooter.textContent = 'SPM-1.0 · Uso institucional';
    printRoot.appendChild(printFooter);

    const style = this.document.createElement('style');
    style.id = 'spm-terms-print-style';
    style.textContent = `
      @media screen {
        #spm-terms-print-root { display: none !important; }
      }
      @media print {
        @page { size: A4; margin: 18mm 17mm; }
        *, *::before, *::after { box-sizing: border-box; }
        html, body {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          background: #fff !important;
        }
        body > :not(#spm-terms-print-root) { display: none !important; }
        #spm-terms-print-root {
          display: block !important;
          position: static !important;
          width: 100% !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          color: #203747 !important;
          background: #fff !important;
          font-family: "Noto Sans", Arial, sans-serif !important;
          font-size: 10.5pt !important;
          line-height: 1.58 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #spm-terms-print-root main,
        #spm-terms-print-root .legal-modal__body {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          flex: none !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          color: inherit !important;
          font: inherit !important;
        }
        #spm-terms-print-root .spm-print-heading {
          display: block !important;
          padding: 0 0 13px !important;
          margin: 0 0 19px !important;
          border-bottom: 2px solid #27475c !important;
        }
        #spm-terms-print-root .spm-print-heading span {
          display: block !important;
          color: #466478 !important;
          font-size: 9pt !important;
          font-weight: 700 !important;
          letter-spacing: .04em !important;
        }
        #spm-terms-print-root .spm-print-heading h1 {
          margin: 7px 0 0 !important;
          color: #193a50 !important;
          font-size: 19pt !important;
          font-weight: 700 !important;
          line-height: 1.25 !important;
        }
        #spm-terms-print-root .legal-modal__lead {
          display: block !important;
          margin: 0 0 19px !important;
          padding: 12px 14px !important;
          background: #edf3f8 !important;
          border: 0 !important;
          border-left: 3px solid #477b9b !important;
          border-radius: 0 !important;
          color: #234158 !important;
          break-inside: avoid-page;
        }
        #spm-terms-print-root .legal-modal__section {
          display: block !important;
          margin: 0 0 16px !important;
          padding: 0 !important;
          break-inside: avoid-page;
          page-break-inside: avoid;
        }
        #spm-terms-print-root .legal-modal__section h3 {
          display: block !important;
          margin: 0 0 6px !important;
          color: #1b4059 !important;
          font-size: 11.5pt !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          break-after: avoid-page;
        }
        #spm-terms-print-root .legal-modal__section p {
          margin: 0 !important;
          color: #203747 !important;
          font-size: inherit !important;
          line-height: inherit !important;
          text-align: left !important;
        }
        #spm-terms-print-root .legal-modal__laws {
          display: block !important;
          margin: 7px 0 0 !important;
          padding-left: 22px !important;
        }
        #spm-terms-print-root .legal-modal__laws li {
          display: list-item !important;
          margin: 0 0 5px !important;
        }
        #spm-terms-print-root a { color: #225f85 !important; text-decoration: underline !important; }
        #spm-terms-print-root footer {
          display: block !important;
          margin: 24px 0 0 !important;
          padding: 8px 0 0 !important;
          border-top: 1px solid #c7d5df !important;
          color: #577083 !important;
          font-size: 9pt !important;
        }
      }
    `;

    this.document.head.appendChild(style);
    this.document.body.appendChild(printRoot);

    const cleanup = (): void => {
      printWindow.removeEventListener('afterprint', cleanup);
      printRoot.remove();
      style.remove();
      if (this.printCleanup === cleanup) {
        this.printCleanup = null;
      }
    };
    this.printCleanup = cleanup;
    printWindow.addEventListener('afterprint', cleanup, { once: true });

    // Dejar que Chrome calcule las dimensiones reales antes de abrir su vista
    // previa; window.print() se ejecuta sobre la página, no dentro de un iframe.
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => {
        if (!printRoot.isConnected) {
          return;
        }
        printRoot.getBoundingClientRect();
        printWindow.print();
      });
    });
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }
    const elements = Array.from(
      this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? []
    ).filter((element) => element.getClientRects().length > 0);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first || !last) {
      return;
    }
    if (!elements.includes(this.document.activeElement as HTMLElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
