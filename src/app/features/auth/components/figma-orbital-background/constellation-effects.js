import * as morph from './morph.js';
import * as nebula from './nebula.js';

const silver = { r: .60, g: .66, b: .75, a: 1 };
const slate = { r: .133, g: .208, b: .267, a: 1 };
const params = [
    { twist: .5, rotationSpeed: 6, gradientMethod: 1, gradient: { stops: [
        { position: 0, color: { r: .82, g: .863, b: .851, a: 1 } },
        { position: .5, color: silver }, { position: 1, color: slate }
    ] } },
    { colorA: slate, colorB: silver, colorC: { r: .353, g: .102, b: .337, a: 1 },
      brightness: .8, center: { x: 50, y: 50 }, travel: 0, starDensity: .1, seed: 0 }
];

export async function animateConstellation(canvases, signal) {
    if (!navigator.gpu || signal.aborted) return;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
    if (!adapter || signal.aborted) return;
    const device = await adapter.requestDevice();
    if (signal.aborted) { device.destroy(); return; }
    const format = navigator.gpu.getPreferredCanvasFormat();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let request = 0;
    let stopped = false;
    const layers = [];
    function stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(request);
        observer.disconnect();
        reduced.removeEventListener('change', schedule);
        document.removeEventListener('visibilitychange', schedule);
        for (const layer of layers) layer.context.unconfigure();
        device.destroy();
    }
    function draw(time) {
        request = 0;
        if (stopped || document.hidden) return;
        try {
            for (const { canvas, context, effect, frame } of layers) {
                const width = Math.max(1, Math.round(canvas.clientWidth * .6));
                const height = Math.max(1, Math.round(canvas.clientHeight * .6));
                const resize = canvas.width !== width || canvas.height !== height;
                if (resize) { canvas.width = width; canvas.height = height; }
                if (effect === nebula && frame.output && !resize) continue;
                frame.output = context.getCurrentTexture();
                frame.time = reduced.matches ? 0 : time;
                effect.render(device, frame);
            }
            if (!reduced.matches) schedule();
        } catch { stop(); }
    }
    function schedule() {
        if (!request && !stopped && !document.hidden) request = requestAnimationFrame(draw);
    }
    const observer = new ResizeObserver(schedule);
    signal.addEventListener('abort', stop, { once: true });
    device.lost.then(stop);
    try {
        for (const [index, effect] of [morph, nebula].entries()) {
            const canvas = canvases[index];
            const context = canvas.getContext('webgpu');
            if (!context) { stop(); return; }
            context.configure({ device, format, alphaMode: 'opaque' });
            const frame = { params: params[index], state: {}, output: null, time: 0 };
            effect.setup(device, frame);
            layers.push({ canvas, context, effect, frame });
        }
        observer.observe(canvases[0]);
        reduced.addEventListener('change', schedule);
        document.addEventListener('visibilitychange', schedule);
        schedule();
    } catch { stop(); }
}
