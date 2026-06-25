import { isPlatformBrowser } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    NgZone,
    OnDestroy,
    PLATFORM_ID,
    ViewChild,
    inject
} from '@angular/core';
import type { Root } from 'react-dom/client';

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
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private reactRoot?: Root;
    private destroyed = false;

    ngAfterViewInit(): void {
        if (!this.isBrowser) {
            return;
        }

        const host = this.reactHost?.nativeElement;

        if (!host) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            void this.mountReactBackground(host);
        });
    }

    ngOnDestroy(): void {
        this.destroyed = true;

        if (!this.isBrowser || !this.reactRoot) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            this.reactRoot?.unmount();
            this.reactRoot = undefined;
        });
    }

    private async mountReactBackground(host: HTMLDivElement): Promise<void> {
        const [{ createElement }, { createRoot }, { FigmaOrbitalBackgroundReact }] =
            await Promise.all([
                import('react'),
                import('react-dom/client'),
                import('./figma-orbital-background.react')
            ]);

        if (this.destroyed) {
            return;
        }

        this.reactRoot = createRoot(host);
        this.reactRoot.render(createElement(FigmaOrbitalBackgroundReact));
    }
}