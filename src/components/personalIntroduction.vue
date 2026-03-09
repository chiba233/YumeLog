<template>
  <div class="textBox glass" @mouseenter="onEnter" @mouseleave="onLeave" @mousemove="onMove">
    <div class="content">
      <div class="detailText commonText">
        {{ displayContent }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useCardGlow } from "@/components/ts/animationCalculate.ts";
import { useYamlText } from "@/components/ts/useYamlI18n.ts";
import { useHead } from "@vueuse/head";
import { computed } from "vue";

const displayContent = useYamlText("main", "introduction.yaml", "introduction");

useHead({
  meta: [
    {
      name: "description",
      content: computed(() => displayContent.value || ""),
    },
    {
      property: "og:description",
      content: computed(() => displayContent.value || ""),
    },
    {
      property: "og:type",
      content: "profile",
    },
  ],
});
const { onMove, onLeave, onEnter } = useCardGlow();
</script>

<style lang="scss" scoped>
.textBox {
  // 核心变量
  --mx: -100px;
  --my: -100px;
  --opacity: 0; // 默认光是隐藏的

  position: relative;

  border-radius: 16px;
  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  // 给一个极淡的静态边框，保证没有光的时候也有轮廓感

  // 布局样式
  display: flex;
  justify-content: center;
  align-items: center; // 垂直居中
  padding: 0.5rem;
  margin: 0.5rem;
  @media (min-width: 350px) {
    width: 50rem;
  }

  // 1. 面光 (Surface Glow) - 柔和的大范围光晕
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      800px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 0.15),
      transparent 40%
    );
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  // 2. 边框光 (Border Glow)
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px; // 边框粗细

    // 1. 定义遮罩源（IDE 现在能理解 mask-image 接受渐变了）
    // noinspection CssInvalidPropertyValue
    -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);

    // 2. 分别指定裁剪区域
    // 第一层对应 content-box，第二层对应 border-box
    // noinspection CssInvalidPropertyValue
    -webkit-mask-clip: content-box, border-box;
    mask-clip: content-box, border-box;

    // 3. 核心：排除操作
    // Webkit 使用 xor，标准使用 exclude
    -webkit-mask-composite: xor;
    mask-composite: exclude;

    // 4. 背景光斑逻辑（保持不变）
    background: radial-gradient(
      200px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 1),
      rgba(255, 255, 255, 0.3) 30%,
      transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  // 文本容器
  .content {
    position: relative;
    z-index: 10; // 必须高于伪元素
    width: 100%;
  }

  .detailText {
    text-align: center;
    word-break: break-word;
    white-space: pre-wrap;
    font-size: 1.15em;
    letter-spacing: 0.02em;
    line-height: 1.5;
  }
}
</style>
