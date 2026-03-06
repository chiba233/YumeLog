<script lang="ts" setup>
import FromNowTime from "@/components/fromNowTime.vue";
import I18NComponents from "@/components/i18nComponents.vue";
</script>

<template>
  <div class="overlay">
    <div class="i18">
      <I18NComponents></I18NComponents>
    </div>
    <div class="fromTime">
      <from-now-time></from-now-time>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.overlay {
  justify-content: center;
  text-align: center;
  z-index: 2;
  left: 0.6em;
  right: 0.6em;
  top: 0.6em;
  padding-top: 0.4em;
  padding-bottom: 0.4em;
  height: 2.2em;
  position: absolute;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 1.5em;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  .fromTime {
    display: flex;
    justify-content: start;
    position: absolute;
    animation: YToolIn 0.5s linear 0s 1;
  }
  .i18 {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    position: absolute;
    animation: YToolIn 0.5s linear 0s 1;
  }
}
</style>
