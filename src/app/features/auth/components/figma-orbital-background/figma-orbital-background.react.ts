import React, { useEffect, useRef } from 'react';

type RgbColor = number[];

interface Star {
    x: number;
    y: number;
    r: number;
    a: number;
    sp: number;
    ph: number;
}

interface OrbitBody {
    angle: number;
    orbitR: number;
    r: number;
    rgb: RgbColor;
    rings: number[];
    speed: number;
    phase: number;
    connectToHub: boolean;
}

interface FloatingOrb {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    rgb: RgbColor;
    rings: number[];
    phase: number;
}

export function FigmaOrbitalBackgroundReact(): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        const drawOrb = (
            orbX: number,
            orbY: number,
            radius: number,
            rgb: RgbColor,
            rings: number[],
            alpha: number
        ) => {
            const [red, green, blue] = rgb;

            const outerGlow = ctx.createRadialGradient(
                orbX,
                orbY,
                0,
                orbX,
                orbY,
                radius * 3.5
            );

            outerGlow.addColorStop(0, `rgba(${red},${green},${blue},${0.22 * alpha})`);
            outerGlow.addColorStop(0.5, `rgba(${red},${green},${blue},${0.06 * alpha})`);
            outerGlow.addColorStop(1, `rgba(${red},${green},${blue},0)`);

            ctx.beginPath();
            ctx.arc(orbX, orbY, radius * 3.5, 0, Math.PI * 2);
            ctx.fillStyle = outerGlow;
            ctx.fill();

            rings.forEach((ring, index) => {
                const ringAlpha = (0.28 - index * 0.07) * alpha;

                ctx.beginPath();
                ctx.arc(orbX, orbY, ring, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${red},${green},${blue},${Math.max(0, ringAlpha)})`;
                ctx.lineWidth = 0.9;
                ctx.stroke();
            });

            const innerGradient = ctx.createRadialGradient(
                orbX,
                orbY,
                0,
                orbX,
                orbY,
                radius
            );

            innerGradient.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
            innerGradient.addColorStop(0.35, `rgba(${red},${green},${blue},${0.98 * alpha})`);
            innerGradient.addColorStop(
                0.75,
                `rgba(${Math.round(red * 0.5)},${Math.round(green * 0.5)},${Math.round(
                    blue * 0.55
                )},${0.85 * alpha})`
            );
            innerGradient.addColorStop(
                1,
                `rgba(${Math.round(red * 0.15)},${Math.round(green * 0.15)},${Math.round(
                    blue * 0.2
                )},${0.7 * alpha})`
            );

            ctx.beginPath();
            ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
            ctx.fillStyle = innerGradient;
            ctx.fill();
        };

        const drawConnection = (
            fromX: number,
            fromY: number,
            toX: number,
            toY: number,
            rgb: RgbColor,
            alpha: number
        ) => {
            const [red, green, blue] = rgb;
            const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);

            gradient.addColorStop(0, `rgba(${red},${green},${blue},${alpha})`);
            gradient.addColorStop(1, `rgba(${red},${green},${blue},${alpha * 0.3})`);

            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.65;
            ctx.stroke();
        };

        const stars: Star[] = Array.from({ length: 280 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 0.85 + 0.12,
            a: Math.random() * 0.5 + 0.12,
            sp: Math.random() * 7e-3 + 3e-3,
            ph: Math.random() * Math.PI * 2
        }));

        const cyan: RgbColor = [55, 190, 210];
        const blue: RgbColor = [70, 145, 225];
        const purple: RgbColor = [120, 100, 215];
        const lightBlue: RgbColor = [90, 175, 235];

        const hub = {
            bx: 0.38,
            by: 0.52,
            r: 68,
            rgb: cyan,
            ringOffsets: [94, 130, 172, 218]
        };

        const orbitBodies: OrbitBody[] = [
            {
                angle: -0.6,
                orbitR: 312,
                r: 36,
                rgb: purple,
                rings: [52, 75],
                speed: 25e-5,
                phase: 0,
                connectToHub: true
            },
            {
                angle: 0.5,
                orbitR: 364,
                r: 26,
                rgb: blue,
                rings: [39, 60],
                speed: -2e-4,
                phase: 1.2,
                connectToHub: true
            },
            {
                angle: 1.4,
                orbitR: 286,
                r: 18,
                rgb: cyan,
                rings: [29],
                speed: 3e-4,
                phase: 2.4,
                connectToHub: true
            },
            {
                angle: 2.2,
                orbitR: 390,
                r: 23,
                rgb: lightBlue,
                rings: [36, 55],
                speed: -18e-5,
                phase: 0.8,
                connectToHub: true
            },
            {
                angle: 3,
                orbitR: 325,
                r: 13,
                rgb: cyan,
                rings: [],
                speed: 22e-5,
                phase: 1.6,
                connectToHub: true
            },
            {
                angle: 3.8,
                orbitR: 260,
                r: 29,
                rgb: blue,
                rings: [42, 65],
                speed: -28e-5,
                phase: 3,
                connectToHub: true
            },
            {
                angle: 4.6,
                orbitR: 403,
                r: 16,
                rgb: purple,
                rings: [26],
                speed: 15e-5,
                phase: 0.4,
                connectToHub: true
            },
            {
                angle: 5.4,
                orbitR: 338,
                r: 21,
                rgb: lightBlue,
                rings: [34, 52],
                speed: -2e-4,
                phase: 2,
                connectToHub: true
            },
            {
                angle: -1.8,
                orbitR: 455,
                r: 10,
                rgb: cyan,
                rings: [],
                speed: 3e-4,
                phase: 1,
                connectToHub: true
            },
            {
                angle: -2.8,
                orbitR: 299,
                r: 14,
                rgb: purple,
                rings: [23],
                speed: -25e-5,
                phase: 3.5,
                connectToHub: true
            }
        ];

        const colors = [cyan, blue, purple, lightBlue];

        const floatingOrbs: FloatingOrb[] = Array.from({ length: 14 }, (_, index) => {
            const radius = Math.random() * 9.1 + 3.9;

            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.12,
                vy: (Math.random() - 0.5) * 0.12,
                r: radius,
                rgb: colors[index % 4],
                rings: Math.random() > 0.5 ? [radius * 1.7, radius * 2.5] : [],
                phase: Math.random() * Math.PI * 2
            };
        });

        let time = 0;
        let animationFrameId = 0;

        const animate = () => {
            time += 4e-3;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            stars.forEach((star) => {
                const alpha = star.a * (0.5 + 0.5 * Math.sin(time * star.sp * 80 + star.ph));

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(195,215,255,${alpha})`;
                ctx.fill();
            });

            const hubX = canvas.width * hub.bx;
            const hubY = canvas.height * hub.by;
            const hubPulse = 0.88 + 0.12 * Math.sin(time * 0.6);

            const renderedBodies = orbitBodies.map((body) => {
                const angle = body.angle + time * body.speed * 1e3;

                return {
                    x: hubX + Math.cos(angle) * body.orbitR,
                    y: hubY + Math.sin(angle) * body.orbitR,
                    body
                };
            });

            renderedBodies.forEach(({ x, y, body }) => {
                if (body.connectToHub) {
                    drawConnection(hubX, hubY, x, y, body.rgb, 0.18);
                }
            });

            for (let index = 0; index < renderedBodies.length; index++) {
                const nextIndex = (index + 1) % renderedBodies.length;

                if (Math.random() < 3e-3) {
                    drawConnection(
                        renderedBodies[index].x,
                        renderedBodies[index].y,
                        renderedBodies[nextIndex].x,
                        renderedBodies[nextIndex].y,
                        renderedBodies[index].body.rgb,
                        0.09
                    );
                }
            }

            [
                [0, 1],
                [2, 3],
                [5, 6],
                [7, 8]
            ].forEach(([from, to]) => {
                drawConnection(
                    renderedBodies[from].x,
                    renderedBodies[from].y,
                    renderedBodies[to].x,
                    renderedBodies[to].y,
                    lightBlue,
                    0.1
                );
            });

            renderedBodies.forEach(({ x, y, body }) => {
                const pulse = 0.9 + 0.1 * Math.sin(time * 0.8 + body.phase);
                const rings = body.rings.map((ring) => ring * pulse);

                drawOrb(x, y, body.r * pulse, body.rgb, rings, 0.88);
            });

            floatingOrbs.forEach((orb) => {
                orb.x += orb.vx;
                orb.y += orb.vy;

                if (orb.x < -50) {
                    orb.x = canvas.width + 50;
                }

                if (orb.x > canvas.width + 50) {
                    orb.x = -50;
                }

                if (orb.y < -50) {
                    orb.y = canvas.height + 50;
                }

                if (orb.y > canvas.height + 50) {
                    orb.y = -50;
                }

                const pulse = 0.88 + 0.12 * Math.sin(time * 0.9 + orb.phase);

                drawOrb(
                    orb.x,
                    orb.y,
                    orb.r * pulse,
                    orb.rgb,
                    orb.rings.map((ring) => ring * pulse),
                    0.65
                );
            });

            const hubRings = hub.ringOffsets.map((ring) => ring * hubPulse);

            drawOrb(hubX, hubY, hub.r * hubPulse, hub.rgb, hubRings, 1);

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return React.createElement('canvas', {
        ref: canvasRef,
        className: 'absolute inset-0 w-full h-full pointer-events-none'
    });
}