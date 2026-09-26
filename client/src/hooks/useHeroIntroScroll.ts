import { RefObject, useEffect } from "react";

export function useHeroIntroScroll(
  heroRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>,
  enabled: boolean,
) {
  useEffect(() => {
    const hero = heroRef.current;
    const content = contentRef.current;
    if (!enabled || !hero || !content) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    let phase: "idle" | "animating" | "settling" = "idle";
    let lastDownInput = 0;
    let touchActive = false;
    let touchStart: { x: number; y: number } | null = null;

    const clearReleaseTimer = () => {
      if (releaseTimer !== null) clearTimeout(releaseTimer);
      releaseTimer = null;
    };

    const releaseWhenQuiet = () => {
      clearReleaseTimer();
      if (phase !== "settling" || touchActive) return;

      // Absorb only the remaining momentum from the gesture that started the move.
      const wait = Math.max(0, 180 - (performance.now() - lastDownInput));
      releaseTimer = setTimeout(() => {
        releaseTimer = null;
        phase = "idle";
      }, wait);
    };

    const cancel = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      clearReleaseTimer();
      phase = "idle";
    };

    const destination = () => {
      const headerSpace = window.innerWidth < 768 ? 64 : 72;
      return Math.max(0, window.scrollY + content.getBoundingClientRect().top - headerSpace);
    };

    const canMoveToContent = () => {
      const bounds = hero.getBoundingClientRect();
      return !reducedMotion.matches
        && bounds.top < window.innerHeight * 0.25
        && bounds.bottom > 120
        && content.getBoundingClientRect().height > 40
        && destination() - window.scrollY >= 40;
    };

    const moveToContent = () => {
      if (phase !== "idle" || !canMoveToContent()) return;
      const start = window.scrollY;
      const end = destination();
      phase = "animating";
      lastDownInput = performance.now();

      // Ease into the next section at a measured pace, then settle softly.
      const duration = 1150;
      let startedAt: number | null = null;
      const step = (now: number) => {
        if (startedAt === null) startedAt = now;
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = Math.sin(progress * Math.PI / 2);
        window.scrollTo({ top: start + (end - start) * eased, behavior: "instant" });

        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          frame = null;
          phase = "settling";
          releaseWhenQuiet();
        }
      };
      frame = requestAnimationFrame(step);
    };

    const noteDownInput = () => {
      lastDownInput = performance.now();
      if (phase === "settling") releaseWhenQuiet();
    };

    const onWheel = (event: WheelEvent) => {
      if ((event.target as Element)?.closest?.("[role=dialog]")) return;
      if (phase !== "idle") {
        if (event.deltaY < 0) {
          cancel();
        } else if (event.deltaY > 0) {
          if (event.cancelable) event.preventDefault();
          noteDownInput();
        }
        return;
      }

      if (event.deltaY <= 0 || event.deltaY <= Math.abs(event.deltaX) || !hero.contains(event.target as Node)) return;
      if (canMoveToContent()) {
        if (event.cancelable) event.preventDefault();
        moveToContent();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStart = null;
      if (event.touches.length !== 1 || (event.target as Element)?.closest?.("[role=dialog]")) return;
      if (phase === "idle" && !hero.contains(event.target as Node)) return;
      touchActive = true;
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchStart || event.touches.length !== 1) return;
      const vertical = touchStart.y - event.touches[0].clientY;
      const horizontal = Math.abs(touchStart.x - event.touches[0].clientX);

      if (phase !== "idle") {
        if (vertical < -24 && -vertical > horizontal * 1.25) {
          cancel();
          touchStart = null;
          touchActive = false;
          return;
        }
        if (event.cancelable) event.preventDefault();
        if (vertical > 0) noteDownInput();
        return;
      }

      if (vertical > 8 && vertical > horizontal * 1.25 && canMoveToContent()) {
        if (event.cancelable) event.preventDefault();
        moveToContent();
      }
    };

    const onTouchEnd = () => {
      touchStart = null;
      touchActive = false;
      releaseWhenQuiet();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (event.key === "PageUp" || event.key === "ArrowUp" || (event.key === " " && event.shiftKey)) {
        if (phase !== "idle") cancel();
        return;
      }

      const isDown = event.key === "PageDown" || event.key === "ArrowDown" || event.key === " ";
      if (!isDown) return;
      if (phase !== "idle") {
        event.preventDefault();
        noteDownInput();
      } else if (canMoveToContent()) {
        event.preventDefault();
        moveToContent();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancel();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, heroRef, contentRef]);
}
