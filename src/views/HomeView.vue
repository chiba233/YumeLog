<template>
  <top-bar class="topBar"></top-bar>
  <div class="viewport">
    <div class="main">
      <Transition mode="out-in" name="page">
        <div :key="cardSelect ? 'home' : 'blog'" class="page-shell">
          <BlogView v-if="!cardSelect" />
          <div v-else class="content">
            <Title />
            <div class="detailsDIV">
              <Details />
            </div>
            <div class="contactsDIV">
              <Contacts />
            </div>
            <MyFriends />
          </div>
        </div>
      </Transition>
    </div>
  </div>
  <div class="copyright">
    <div class="cardButton">
      <n-button :color="themeColor" class="cButton" round @click="cardChange('b')">
        <template #icon>
          <n-icon size="23">
            <Home12Regular></Home12Regular>
          </n-icon>
        </template>
        <a>{{ home[lang] }}</a>
      </n-button>
      <n-button :color="themeColor" class="cButton" round @click="cardChange('a')">
        <template #icon>
          <n-icon size="23">
            <AnimalRabbit28Regular></AnimalRabbit28Regular>
          </n-icon>
        </template>
        <a>{{ blog[lang] }}</a>
      </n-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Title from "@/components/title.vue";
import Details from "@/components/detail.vue";
import Contacts from "@/components/contacts.vue";
import MyFriends from "@/components/myFriends.vue";
import colorData from "@/data/components/colorData.json";
import { lang, themeColor } from "@/components/ts/useStoage";
import TopBar from "@/components/topBar.vue";
import { AnimalRabbit28Regular, Home12Regular } from "@vicons/fluent";
import { NButton, NIcon } from "naive-ui";
import { Component, defineAsyncComponent, onMounted, ref } from "vue";


const BlogView: Component = defineAsyncComponent(() => import("@/views/BlogView.vue"));

const cardSelect = ref(true);

type ThemeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type BackgroundKey = `background${ThemeIndex}`;
type ColorData = Record<BackgroundKey, string>;
const randomTheme = Math.floor(Math.random() * 9);
const selectedColor = (colorData as ColorData)[
  `background${randomTheme}` as BackgroundKey
  ];
const bg = document.getElementById("bg")!;
onMounted(() => {
  themeColor.value = selectedColor;
  bg.style.backgroundImage = `url(background${randomTheme}.webp)`;
  document.body.style.cssText = `background-color: ${selectedColor}`;
});

function cardChange(e: string) {
  if (e === "a") {
    cardSelect.value = false;
  }
  if (e === "b") cardSelect.value = true;
}

const home: Record<string, string> = {
  zh: "主页",
  ja: "ホーム",
  en: "Home",
  other: "home",
};
const blog: Record<string, string> = {
  zh: "博客",
  ja: "ブログ",
  en: "blog",
  other: "blog",
} as const;

</script>

<style lang="scss">
.topBar {
  animation: upToDown 0.7s linear 0s 1;
}

.viewport {
  display: flex;
  flex-direction: column;
  overflow-y: auto; // ✅ 唯一滚动区
  position: relative;
  -webkit-overflow-scrolling: touch; /* 优化移动端滚动 */
  .main {
    height: 100dvh;
    animation: slide-fwd-center 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;

    .content {
      width: 100%;
      display: flex;
      flex-direction: column;
      flex-wrap: wrap;

      .contactsDIV {
        @media (min-width: 730px) {
          margin: 0.95em;
        }
      }

      .detailsDIV {
        width: 100%;
        display: flex;
        justify-content: center;
      }
    }
  }
}

.copyright {
  left: 0.6em;
  right: 0.6em;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 1.5em;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 3em;
  position: absolute;
  animation: downToUp 0.7s linear 0s 1;
  z-index: 2;
  pointer-events: auto;
  bottom: calc(0.4em + env(safe-area-inset-bottom));

  .cButton {
    margin-right: 1em;
    height: 2.2em;
    border: 1px solid rgba(255, 255, 255, 0.2);
    pointer-events: auto;
    @media (max-width: 300px) {
      .n-icon {
        margin-left: 6px;
      }
    }

    a {
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
      color: #191919;
      @media (max-width: 300px) {
        display: none;
      }
    }
  }
}

@keyframes downToUp {
  from {
    transform: translateY(3em);
  }

  to {
    transform: none;
  }
}

@keyframes upToDown {
  from {
    transform: translateY(-3em);
  }
  to {
    transform: none;
  }
}

@keyframes slide-fwd-center {
  0% {
    transform: scale(0.9) translateY(20px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}


.page-enter-active {
  animation: slide-fwd-center 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  will-change: transform;
}

/* 不要 leave 动画 */
.page-leave-active {
  animation: none;
}
</style>
