"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; r: number; vx: number; vy: number; hue: number; alpha: number; life: number; max: number };

// Teintes : or du monogramme, or clair, crème
const palettes = {
  // Sur fond sombre : lumière additive
  dark: { tones: [[196, 151, 79], [229, 182, 90], [246, 241, 234]], blend: "lighter" as GlobalCompositeOperation, strength: 0.22 },
  // Sur fond clair : voile doré et nacré
  light: { tones: [[196, 151, 79], [255, 255, 255], [229, 182, 90]], blend: "source-over" as GlobalCompositeOperation, strength: 0.16 },
};

/**
 * Brume parfumée : particules floues qui montent lentement et dérivent vers la souris.
 * Canvas 2D léger, en pause hors écran et pour les animations réduites.
 */
export function Mist({ className, density = 46, tone = "dark" }: { className?: string; density?: number; tone?: keyof typeof palettes }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: 0.5, y: 0.5 };
    const count = window.innerWidth < 640 ? Math.round(density * 0.55) : density;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (initial: boolean): Particle => {
      const max = 600 + Math.random() * 700;
      return {
        x: width * (0.15 + Math.random() * 0.7),
        y: initial ? Math.random() * height : height + 40,
        r: 30 + Math.random() * 110,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.12 + Math.random() * 0.35),
        hue: Math.random(),
        alpha: 0,
        life: initial ? Math.random() * max : 0,
        max,
      };
    };

    resize();
    const particles = Array.from({ length: count }, () => spawn(true));

    const { tones, blend, strength } = palettes[tone];

    let frame = 0;
    let visible = true;
    const draw = () => {
      // Toile masquée ou pas encore mesurée (bloc caché sur mobile…) : rien à dessiner
      if (width <= 0 || height <= 0) {
        resize();
        if (width <= 0 || height <= 0) return;
        for (let i = 0; i < particles.length; i++) particles[i] = spawn(true);
      }
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = blend;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += 1;
        if (p.life > p.max || p.y < -p.r * 2) {
          particles[i] = spawn(false);
          continue;
        }
        // Apparition et disparition en douceur
        const t = p.life / p.max;
        p.alpha = Math.sin(Math.PI * t) * strength;
        // Légère attirance vers la souris
        p.vx += ((pointer.x * width - p.x) / width) * 0.0025;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        const [r, g, b] = tones[Math.floor(p.hue * tones.length)];
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${p.alpha})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible && !reduced) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
    };
  }, [density, tone]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
