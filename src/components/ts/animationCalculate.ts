import { ref } from "vue";

export function useCardGlow() {
  // 注意：在 v-for 中，我们不再依赖 cardRef 来寻找元素
  // 而是直接通过事件冒泡中的 currentTarget 来操作
  const cardRef = ref<HTMLElement | null>(null);

  const onMove = (e: MouseEvent): void => {
    // 关键点：使用 currentTarget 确保拿到的是绑定了事件的那个 .friendBox
    const card = e.currentTarget as HTMLElement;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    card.style.setProperty("--opacity", "1");
  };

  const onLeave = (e: MouseEvent): void => {
    const card = e.currentTarget as HTMLElement;
    if (!card) return;
    card.style.setProperty("--opacity", "0");
  };

  return {
    cardRef, // 虽然 v-for 会把它变数组，但我们现在逻辑改用事件驱动，它依然可以留着兼容
    onMove,
    onLeave,
  };
}