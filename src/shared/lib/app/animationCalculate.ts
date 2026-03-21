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

      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
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
