import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-consolidated-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './consolidated-profile.html',
  styleUrl: './consolidated-profile.scss'
})
export class ConsolidatedProfileComponent {
  @Input({ required: true }) completedLabel = '0 de 49';
  @Input() accepted = false;

  @Output() readonly acceptedRequested = new EventEmitter<void>();

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