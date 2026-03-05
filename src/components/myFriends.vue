<template>
  <a class="friendTitle">{{
      friendsMessage[
        `title${lang === "zh" ? "ZH" : lang === "en" ? "EN" : lang === "ja" ? "JP" : "Other"}`
        ]
    }}</a>
  <div class="allFriends">
    <div
      v-for="{ icon, name, url, aliasEN } in friends" :key="aliasEN" class="friendBox" @click="openURL(url)"
      @mouseleave="onLeave" @mousemove="onMove">
      <div class="content">
        <n-avatar :size="100" :src="icon" bordered round></n-avatar>
        <a v-if="lang === 'zh'" class="friendName">
          {{ name }}
        </a>
        <a v-if="lang != 'zh'" class="friendName">
          {{ aliasEN }}
        </a>
      </div>
    </div>
  </div>
</template>
)

<script lang="ts" setup>
import { NAvatar } from "naive-ui";
import friends from "@/data/components/friends.json";
import friendsMessage from "@/data/I18N/friendsMessage.json";
import { lang } from "@/components/ts/useStoage";
import { useCardGlow } from "@/components/ts/animationCalculate.ts";

const { onMove, onLeave } = useCardGlow();

function openURL(url: string) {
  window.open(url);
}
</script>

<style lang="scss">
$transition-speed: 0.3s;
.friendTitle {
  left: 0;
  right: 0;
  color: white;
  font-weight: lighter;
  text-align: center;
  text-shadow: #383838 1px 0 0,
  #383838 0 1px 0,
  #383838 -1px 0 0,
  #383838 0 -1px 0;
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
  @media (min-width: 840px) {
    font-size: 1.9em;
  }
  @media (max-width: 840px) {
    font-size: 1.7em;
  }
}

.allFriends {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 4rem;
}

.content {
  display: flex;
  align-items: center;
  flex-direction: column;
  position: relative;
  z-index: 10;
  width: 100%;

}

.friendBox {
  background-color: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

  --mx: -100px;
  --my: -100px;
  --opacity: 0; // 默认光是隐藏的

  position: relative;

  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s, background-color 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  }

  &::before {
    content: '';
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
        50px circle at var(--mx) var(--my),
        rgba(255, 255, 255, 1),
        rgba(255, 255, 255, 0.3) 30%,
        transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  width: 7.5em;
  height: 10em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  @media (min-width: 450px) {
    padding: 0.5em;
    margin-left: 0.6em;
    margin-right: 0.6em;
    margin-bottom: 1.2em;
    border-radius: 15px;
  }

  @media (max-width: 450px) {
    padding: 0.5em;
    margin-left: 0.3em;
    margin-right: 0.3em;
    margin-bottom: 0.6em;
    border-radius: 8px;
  }

  .n-avatar {
    width: 6em;
    height: 6em;
    margin-bottom: 0.9em;
    margin-top: 0.08em;
  }

  .friendName {
    color: #191919;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    white-space: nowrap;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    box-orient: vertical; //test values
    line-clamp: 1;
    width: auto;
  }
}
</style>
