<template>
  <a class="friendTitle">
    {{ friendsTitle.title }}
  </a>
  <div class="allFriends">
    <div
      v-for="friend in friends"
      :key="friend.name"
      class="friendBox glass"
      @click="openURL(friend.url)"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <div class="content">
        <n-avatar :size="100" :src="friend.icon" bordered round></n-avatar>
        <a v-if="lang === 'zh'" class="friendName commonText">
          {{ friend.name }}
        </a>
        <a v-if="lang != 'zh'" class="friendName commonText">
          {{ friend.alias }}
        </a>
      </div>
    </div>
  </div>
</template>
)

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { NAvatar } from "naive-ui";
import friendsMessage from "@/data/I18N/friendsMessage.json";
import { lang } from "@/components/ts/setupLang.ts";
import { useCardGlow } from "@/components/ts/animationCalculate.ts";
import { useContentStore } from "@/components/ts/contentStore.ts";
import { useHead } from "@unhead/vue";

interface Friend {
  name: string;
  alias: string;
  url: string;
  icon: string;
}

interface YamlResponse {
  friends: Friend[];
}

type I18nSource = Record<string, Record<string, string>>;

const { onMove, onLeave, onEnter } = useCardGlow();
const { getSingle } = useContentStore();
const friends = ref<Friend[]>([]);

const friendsTitle = computed(() => {
  const source = friendsMessage as I18nSource;
  return {
    title: source.title[lang.value] ?? source.title.en,
  };
});

function openURL(url: string) {
  window.open(url, "_blank");
}

useHead({
  meta: [
    {
      name: "friends",
      content: computed(() => {
        const names = friends.value.map((f) => (lang.value === "zh" ? f.name : f.alias)).join(", ");
        return `${friendsTitle.value.title}${names ? ": " + names : ""}`.slice(0, 160);
      }),
    },
    { property: "og:title", content: computed(() => friendsTitle.value.title) },
    {
      property: "og:friends",
      content: computed(() => {
        const names = friends.value.map((f) => (lang.value === "zh" ? f.name : f.alias)).join(", ");
        return `${friendsTitle.value.title}${names ? "：" + names : ""}`.slice(0, 160);
      }),
    },
  ],
});

onMounted(async () => {
  const rawData = await getSingle<YamlResponse>("main", "friends.yaml");

  if (rawData && rawData.friends) {
    friends.value = rawData.friends;
  }
});
</script>

<style lang="scss">
$transition-speed: 0.3s;
.friendTitle {
  left: 0;
  right: 0;
  text-align: center;
  color: #eaeaea;
  text-shadow:
    0.5px 0 0 rgba(0, 0, 0, 0.7),
    -0.5px 0 0 rgba(0, 0, 0, 0.7),
    0 0.5px 0 rgba(0, 0, 0, 0.7),
    0 -0.5px 0 rgba(0, 0, 0, 0.7);
  font-weight: 350;
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
  justify-content: center;
}

.friendBox {
  cursor: pointer;

  --mx: -100px;
  --my: -100px;
  --opacity: 0; // 默认光是隐藏的

  position: relative;

  border-radius: 16px;
  overflow: hidden;
  transition:
    transform 0.2s,
    background-color 0.3s;

  &:hover {
    transform: translateY(-4px);
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
    justify-content: center;
  }

  .friendName {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: center;
  }
}
</style>
