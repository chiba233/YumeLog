<script lang="ts" setup>
import FromNowTime from "@/components/fromNowTime.vue";
import I18NComponents from "@/components/i18nComponents.vue";
import { nextTick, onMounted, ref, watch } from "vue";
import { lang } from "@/components/ts/setupLang.ts";

const btnWidth = ref<string>("auto");

const syncWidth = () => {
  const buttons = document.querySelectorAll<HTMLElement>(".sync-btn");
  if (buttons.length === 0) return;

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

  if (max > 0) {
    const newWidth = `${max + 1}px`;
    if (btnWidth.value !== newWidth) {
      btnWidth.value = newWidth;
    }
  } else {
    btnWidth.value = "auto";
  }
};

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
</script>

<template>
  <div class="overlay">
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
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 1.4em;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  justify-content: space-between;
  box-sizing: border-box;

  .fromTime {
    display: flex;
    align-items: center;
    animation: YToolIn 0.5s linear 0s 1;
    flex-shrink: 0;
  }

  .i18 {
    display: flex;
    align-items: center;
    animation: YToolIn 0.5s linear 0s 1;
    flex-shrink: 0;
  }
}
</style>
