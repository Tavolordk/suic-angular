import { Component } from '@angular/core';

/** Mascota del asistente de análisis: utiliza la paleta original del grafo SUIC. */
@Component({
  selector: 'app-lince-mascot',
  standalone: true,
  template: `
    <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="44" cy="44" r="42" fill="#152D42" stroke="#426681" stroke-width="1.5" />
      <circle cx="44" cy="44" r="36.5" stroke="#8BD4FF" stroke-opacity=".16" />
      <!-- Las puntas largas de las orejas identifican al lince. -->
      <path d="M18 31 12 8 30 22 44 19 58 22 76 8 70 31" fill="#263F53" stroke="#9EC8E1" stroke-width="2.7" stroke-linejoin="round" />
      <path d="m16.5 14 8 14-6 7-2-21ZM71.5 14l-8 14 6 7 2-21Z" fill="#E5B573" fill-opacity=".64" />
      <path d="M17 37C17 23 29 20 44 20s27 3 27 17v12c0 18-12 29-27 29S17 67 17 49V37Z" fill="#9CB4C6" stroke="#D7EAF5" stroke-width="2" />
      <path d="M21 54c2.6 13 11 20 23 20 12.1 0 20.5-7 23-20-8 2.2-14.5 4.3-23 4.3S29 56.2 21 54Z" fill="#E9EDF0" />
      <path d="M30 30c3-2.6 5.2-2.7 8-1.1M50 28.9c3-1.6 5-1.5 8 1.1" stroke="#49687C" stroke-width="2.3" stroke-linecap="round" />
      <g class="lince-mascot__eyes">
        <path d="M26 43.5c3.5-4 8.5-4 12 0" stroke="#243C4B" stroke-width="3.2" stroke-linecap="round" />
        <path d="M50 43.5c3.5-4 8.5-4 12 0" stroke="#243C4B" stroke-width="3.2" stroke-linecap="round" />
        <ellipse cx="33" cy="44" rx="4.8" ry="6.2" fill="#E9B75F" />
        <ellipse cx="55" cy="44" rx="4.8" ry="6.2" fill="#E9B75F" />
        <ellipse cx="33" cy="44" rx="1.8" ry="5.2" fill="#102432" />
        <ellipse cx="55" cy="44" rx="1.8" ry="5.2" fill="#102432" />
        <circle cx="34.5" cy="42" r="1.4" fill="#FFFFFF" />
        <circle cx="56.5" cy="42" r="1.4" fill="#FFFFFF" />
      </g>
      <path d="m39 58 5-3 5 3-5 3-5-3Z" fill="#263D4D" />
      <path d="M44 61v3m0 0c-3 3-6 3-8 0m8 0c3 3 6 3 8 0" stroke="#415261" stroke-width="1.7" stroke-linecap="round" />
      <path d="m25 58-10-2m10 7-10 2m48-7 10-2m-10 7 10 2" stroke="#D4E8F5" stroke-width="1.4" stroke-linecap="round" />
      <path d="m24 35-6-2m45 2 6-2" stroke="#5A7487" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; width: 100%; height: 100%; flex: 0 0 auto; }
    svg { display: block; width: 100%; height: 100%; }
    .lince-mascot__eyes { transform-origin: 44px 44px; animation: lince-blink 7s ease-in-out infinite; }
    @keyframes lince-blink { 0%, 45%, 47%, 100% { transform: scaleY(1); } 46% { transform: scaleY(.12); } }
    @media (prefers-reduced-motion: reduce) { .lince-mascot__eyes { animation: none; } }
  `]
})
export class LinceMascotComponent {}
