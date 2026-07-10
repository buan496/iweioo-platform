"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: "blue" | "white";
};

export function ParticleBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let animationId = 0;
    let pixelRatio = 1;

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1 - 0.02,
      radius: Math.random() * 2.4 + 1,
      alpha: Math.random() * 0.26 + 0.24,
      hue: Math.random() > 0.28 ? "blue" : "white"
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const targetCount = width < 720 ? 18 : 54;
      particles.length = 0;
      for (let index = 0; index < targetCount; index += 1) {
        particles.push(createParticle());
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (const particle of particles) {
        const pointer = pointerRef.current;
        const pointerX = pointer.x * width;
        const pointerY = pointer.y * height;
        const distanceX = particle.x - pointerX;
        const distanceY = particle.y - pointerY;
        const distance = Math.hypot(distanceX, distanceY);
        const influence = pointer.active ? Math.max(0, 1 - distance / 180) : 0;
        const pushX = influence > 0 ? (distanceX / Math.max(distance, 1)) * influence * 0.32 : 0;
        const pushY = influence > 0 ? (distanceY / Math.max(distance, 1)) * influence * 0.32 : 0;
        const pullX = pointer.active ? (pointer.x - 0.5) * 0.018 : 0;
        const pullY = pointer.active ? (pointer.y - 0.5) * 0.018 : 0;

        particle.x += particle.vx + pullX + pushX;
        particle.y += particle.vy + pullY + pushY;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        const gradient = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 8
        );
        if (particle.hue === "white") {
          gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.alpha * 0.85})`);
          gradient.addColorStop(0.42, `rgba(210, 230, 255, ${particle.alpha * 0.28})`);
        } else {
          gradient.addColorStop(0, `rgba(205, 230, 255, ${particle.alpha})`);
          gradient.addColorStop(0.45, `rgba(92, 157, 255, ${particle.alpha * 0.42})`);
        }
        gradient.addColorStop(1, "rgba(80, 148, 255, 0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * 8, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";

      if (!reducedMotion) {
        animationId = requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
        active: true
      };
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}
