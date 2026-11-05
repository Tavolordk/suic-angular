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
    this.document.body.style.overflow = this.oldOverflow;
    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus();
    }
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
