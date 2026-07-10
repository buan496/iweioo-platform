"use client";

import { useEffect, useRef } from "react";

const interactiveSelector =
  "a, button, [data-cursor='interactive'], .featured-project-card, .editorial-card, .card, .carousel-control, .text-link";

export function CursorHalo() {
  const haloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const halo = haloRef.current;
    if (!halo) {
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) {
      halo.style.display = "none";
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let animationId = 0;

    const animate = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      scale += (targetScale - scale) * 0.16;

      halo.style.opacity = visible ? "1" : "0";
      halo.style.transform = `translate3d(${currentX - 24}px, ${currentY - 24}px, 0) scale(${scale})`;
      animationId = requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      visible = true;

      const target = event.target;
      targetScale =
        target instanceof Element && target.closest(interactiveSelector) ? 2.15 : 1;
    };

    const handlePointerLeave = () => {
      visible = false;
    };

    animationId = requestAnimationFrame(animate);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return <div ref={haloRef} className="cursor-halo" aria-hidden="true" />;
}
