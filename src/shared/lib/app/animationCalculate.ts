import { ref } from "vue";

export const useCardGlow = () => {
  const cardRef = ref<HTMLElement | null>(null);

  let rect: DOMRect | null = null;
  let raf = 0;

  const onEnter = (e: MouseEvent): void => {
    const card = e.currentTarget as HTMLElement;
    if (!card) return;

    rect = card.getBoundingClientRect();
  };

  const onMove = (e: MouseEvent): void => {
    const card = e.currentTarget as HTMLElement;
    if (!card || !rect) return;

    cancelAnimationFrame(raf);

    raf = requestAnimationFrame(() => {
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = x / rect.width;
      const ny = y / rect.height;

      const ease = (t: number) => t + (t - 0.5) * 0.1;

      const ex = ease(nx) * rect.width;
      const ey = ease(ny) * rect.height;
      card.style.setProperty("--mx", `${ex}px`);
      card.style.setProperty("--my", `${ey}px`);
      card.style.setProperty("--opacity", "1");
    });
  };

  const onLeave = (e: MouseEvent): void => {
    const card = e.currentTarget as HTMLElement;
    if (!card) return;

    card.style.setProperty("--opacity", "0");
    rect = null;
  };

  return {
    cardRef,
    onEnter,
    onMove,
    onLeave,
  };
};
