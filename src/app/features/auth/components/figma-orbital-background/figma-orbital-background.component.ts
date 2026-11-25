import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';

@Component({
    selector: 'app-figma-orbital-background',
    standalone: true,
    templateUrl: './constellation.html',
    styleUrl: './constellation.scss'
})
export class FigmaOrbitalBackgroundComponent implements AfterViewInit, OnDestroy {
    @ViewChild('morph', { static: true }) private morph!: ElementRef<HTMLCanvasElement>;
    @ViewChild('nebula', { static: true }) private nebula!: ElementRef<HTMLCanvasElement>;
    private readonly zone = inject(NgZone);
    private readonly platform = inject(PLATFORM_ID);
    private readonly lifecycle = new AbortController();

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platform)) return;
        this.zone.runOutsideAngular(async () => {
            try {
                const { animateConstellation } = await import('./constellation-effects.js');
                await animateConstellation([this.morph.nativeElement, this.nebula.nativeElement], this.lifecycle.signal);
            } catch {
                // La constelación y la atmósfera CSS siguen visibles sin WebGPU.
            }
        });
    }

    ngOnDestroy(): void {
        this.lifecycle.abort();
    }
}
