<script lang="ts" setup>
import FromNowTime from "@/features/home/components/fromNowTime.vue";
import I18NComponents from "@/shared/components/i18nComponents.vue";
import { nextTick, onMounted, ref, watch } from "vue";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { useCardGlow } from "@/shared/lib/app/animationCalculate.ts";

const btnWidth = ref<string>("auto");

const syncWidth = () => {
  if (import.meta.env.SSR) return;

  const buttons = document.querySelectorAll<HTMLElement>(".sync-btn");
  if (!buttons.length) return;

  let max = 0;

  buttons.forEach((el) => {
    const oldWidth = el.style.width;
    const oldMinWidth = el.style.minWidth;

    el.style.width = "auto";
    el.style.minWidth = "auto";

    const w = el.offsetWidth;
    if (w > max) max = w;

    el.style.width = oldWidth;
    el.style.minWidth = oldMinWidth;
  });

  btnWidth.value = max > 0 ? `${max + 1}px` : "auto";
};

onMounted(syncWidth);

watch(lang, () => {
  void nextTick(() => {
    syncWidth();
  });
});

onMounted(() => {
  const observer = new ResizeObserver(() => {
    requestAnimationFrame(syncWidth);
  });

  document.querySelectorAll(".sync-btn").forEach((el) => {
    observer.observe(el);
  });

  syncWidth();
  setTimeout(syncWidth, 500);
});
const { onMove, onLeave, onEnter } = useCardGlow();
</script>

<template>
  <div class="overlay" @mouseenter="onEnter" @mouseleave="onLeave" @mousemove="onMove">
    <div class="i18">
      <I18NComponents :btn-width="btnWidth"></I18NComponents>
    </div>
    <div class="fromTime">
      <from-now-time :btn-width="btnWidth"></from-now-time>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.overlay {
  z-index: 2;
  left: 0.6em;
  right: 0.6em;
  top: 0.45em;
  height: 3em;
  position: absolute;
  background-color: rgba(251, 238, 241, 0.1);
  border: 1px solid rgba(251, 238, 241, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 1.4em;
  backdrop-filter: saturate(110%) blur(5px);
  -webkit-backdrop-filter: saturate(110%) blur(5px);
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  justify-content: space-between;
  box-sizing: border-box;

  --mx: -100px;
  --my: -100px;
  --opacity: 0;
  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      800px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.15),
      transparent 40%
    );
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    -webkit-mask-clip: content-box, border-box;
    mask-clip: content-box, border-box;
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    background: radial-gradient(
      160px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.12),
      transparent 60%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .fromTime {
    display: flex;
    align-items: center;
    animation: YToolIn 0.5s linear 0s 1;
    flex-shrink: 0;
    z-index: 3;
  }

  .i18 {
    display: flex;
    align-items: center;
    animation: YToolIn 0.5s linear 0s 1;
    flex-shrink: 0;
    z-index: 3;
  }
}
</style>
