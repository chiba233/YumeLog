<template>
  <h2 class="friendTitle">
    {{ friendsTitle.title }}
  </h2>
  <div class="allFriends">
    <template v-for="friend in friends" :key="friend.name">
      <div
        class="friendBox glass"
        style="position: relative"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
        @mousemove="onMove"
      >
        <a
          :href="friend.url"
          target="_blank"
          :aria-label="lang === 'zh' ? friend.name : friend.alias"
          class="friend-link-overlay"
          rel="noopener noreferrer"
          @click.prevent="openURL(friend.url)"
        >
          {{ lang === "zh" ? friend.name : friend.alias }}
        </a>

        <div class="friendsContent">
          <n-avatar
            :img-props="{
              alt: lang === 'zh' ? friend.name : friend.alias,
            }"
            :fallback-src="friend.spare"
            :size="100"
            :src="friend.icon || friend.spare"
            lazy
            bordered
            round
          />
          <span :lang="lang" class="friendName commonText">
            {{ lang === "zh" ? friend.name : friend.alias }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onServerPrefetch } from "vue";
import { NAvatar } from "naive-ui";
import { lang } from "@/components/ts/global/setupLang.ts";
import { useCardGlow } from "@/components/ts/global/animationCalculate.ts";
import { useContentStore } from "@/components/ts/global/contentStore.ts";
import { $message } from "@/components/ts/global/msgUtils.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { FriendsYamlResponse } from "../ts/d.ts";
import { friends, friendsTitle } from "../ts/global/useGlobalState.ts";
import { friendsUseHead } from "@/components/ts/global/useHead.ts";

type I18nMap = Record<string, string>;

const { onMove, onLeave, onEnter } = useCardGlow();
const { getSingle } = useContentStore();
const loadFriendsData = async () => {
  try {
    const rawData = await getSingle<FriendsYamlResponse>("main", "friends.yaml");
    if (rawData && rawData.friends) {
      friends.value = rawData.friends;
    }
  } catch {
    const yamlEntry = commonI18n.yamlLoadFailed as I18nMap;
    const yamlMsg = (yamlEntry[lang.value] || yamlEntry.en).replace("{err}", "friends.yaml");
    $message.error(yamlMsg, true, 3000);
  }
};
onServerPrefetch(async () => {
  await loadFriendsData();
});

onMounted(() => {
  if (friends.value.length === 0) {
    void loadFriendsData();
  }
});

const openURL = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

friendsUseHead();
</script>

<style lang="scss">
$transition-speed: 0.3s;
.friend-link-overlay {
  position: absolute;
  inset: 0;
  display: block;
  z-index: 5;
  opacity: 0;
  border-radius: inherit;
  background: transparent;
  text-decoration: none;
  color: transparent;
  -webkit-tap-highlight-color: transparent;
}
.friendTitle {
  left: 0;
  right: 0;
  text-align: center;
  color: var(--direct-font-color);
  text-shadow: var(--direct-font-shadow);
  font-weight: 500;
  margin-bottom: 0.5rem;
  margin-top: 0;
  @media (min-width: 840px) {
    font-size: 2em;
  }
  @media (max-width: 840px) {
    font-size: 1.8em;
  }
}

.allFriends {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 4rem;
  @media (min-width: 975px) {
    max-width: 95%;
    margin: auto;
  }
}

.friendsContent {
  display: flex;
  align-items: center;
  flex-direction: column;
  position: relative;
  z-index: 3;
  width: 100%;
  justify-content: center;
}

.friendBox {
  cursor: pointer;

  --mx: -100px;
  --my: -100px;
  --opacity: 0; // 默认光是隐藏的

  position: relative;

  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  &:hover {
    transform: translateY(-2px);
    transition:
      transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  }

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      120px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.12),
      transparent 65%
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
      30px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.8),
      rgba(251, 238, 241, 0.2) 30%,
      transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  width: 7.6em;
  height: 10em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.5em;
  margin-left: 0.35em;
  margin-right: 0.35em;
  margin-bottom: 0.7em;
  border-radius: 16px;

  .n-avatar {
    width: 6em;
    height: 6em;
    margin-bottom: 0.9em;
    margin-top: 0.08em;
    justify-content: center;
  }

  .friendName {
    display: block;
    max-width: 100%;
    font-weight: normal;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
