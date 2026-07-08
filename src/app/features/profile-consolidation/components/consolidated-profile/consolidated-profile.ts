import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface ConsolidatedSelectedField {
  id: string;
  label: string;
  value: string;
  selected: boolean;
  sourceTitle: string;
  sourceColor: string;
}

@Component({
  selector: 'app-consolidated-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './consolidated-profile.html',
  styleUrl: './consolidated-profile.scss'
})
export class ConsolidatedProfileComponent {
  @ViewChild('consolidatedDialog')
  private readonly consolidatedDialog?: ElementRef<HTMLDialogElement>;
  @Input() profileId = '1';
  @Input({ required: true }) completedLabel = '0 de 49';
  @Input() selectedFields: ConsolidatedSelectedField[] = [];
  @Input() accepted = false;

  @Output() readonly acceptedRequested = new EventEmitter<void>();

  requestAcceptance(): void {
    this.acceptedRequested.emit();
    this.openConsolidatedModal();
  }

  openConsolidatedModal(): void {
    const dialog = this.consolidatedDialog?.nativeElement;

    if (!dialog) {
      requestAnimationFrame(() => this.openConsolidatedModal());
      return;
    }

    try {
      if (!dialog.open) {
        dialog.showModal();
      }

      dialog.focus();
    } catch {
      dialog.setAttribute('open', '');
    }
  }

  closeConsolidatedModal(): void {
    const dialog = this.consolidatedDialog?.nativeElement;

    if (!dialog) {
      return;
    }

    if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }

  onConsolidatedDialogClick(event: MouseEvent): void {
    if (event.target === this.consolidatedDialog?.nativeElement) {
      this.closeConsolidatedModal();
    }
  }

  readonly profileImages = [
    {
      src: 'person-left.png',
      alt: 'Perfil izquierdo'
    },
    {
      src: 'person-front.png',
      alt: 'Perfil frontal'
    },
    {
      src: 'person-right.png',
      alt: 'Perfil derecho'
    }
  ];
}