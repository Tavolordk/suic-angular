import {
    AfterViewInit,
    Component,
    ElementRef,
    NgZone,
    OnDestroy,
    ViewChild,
    inject
} from '@angular/core';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { FigmaOrbitalBackgroundReact } from './figma-orbital-background.react';

@Component({
    selector: 'app-figma-orbital-background',
    standalone: true,
    template: `
    <div #reactHost class="figma-orbital-background__host"></div>
  `,
    styles: [
        `
      :host {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .figma-orbital-background__host {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .figma-orbital-background__host canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `
    ]
})
export class FigmaOrbitalBackgroundComponent implements AfterViewInit, OnDestroy {
    @ViewChild('reactHost', { static: true })
    private readonly reactHost?: ElementRef<HTMLDivElement>;

    private readonly ngZone = inject(NgZone);
    private reactRoot?: Root;

    ngAfterViewInit(): void {
        const host = this.reactHost?.nativeElement;

        if (!host) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            this.reactRoot = createRoot(host);
            this.reactRoot.render(React.createElement(FigmaOrbitalBackgroundReact));
        });
    }

    ngOnDestroy(): void {
        this.ngZone.runOutsideAngular(() => {
            this.reactRoot?.unmount();
        });
    }
}