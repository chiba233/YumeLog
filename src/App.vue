<script lang="ts" setup>
import { RouterView, useRouter } from "vue-router";
import { onMounted } from "vue";
import { NButton, NIcon, NMessageProvider } from "naive-ui";
import { AnimalRabbit28Regular, Home12Regular } from "@vicons/fluent";
import MessageProvider from "@/components/MessageProvider.vue";
import TopBar from "@/components/topBar.vue";
import colorData from "../public/data/config/colorData.json";
import { lang, themeColor } from "@/components/ts/useStoage";

const router = useRouter();

const themeCount = Object.keys(colorData).length;
const randomTheme = Math.floor(Math.random() * themeCount);
const selectedColor = (colorData as Record<string, string>)[`background${randomTheme}`];

onMounted(() => {
  const bg = document.getElementById("bg")!;
  themeColor.value = selectedColor;
  if (bg) bg.style.backgroundImage = `url(/background${randomTheme}.webp)`;
  document.body.style.cssText = `background-color: ${selectedColor}`;
});

// 路由跳转
const goTo = (name: string) => router.push({ name });

const homeLabel: Record<string, string> = { zh: "主页", ja: "ホーム", en: "Home" };
const blogLabel: Record<string, string> = { zh: "博客", ja: "ブログ", en: "Blog" };
</script>

<template>
  <n-message-provider>
    <MessageProvider>
      <top-bar class="topBar"></top-bar>
      <div class="viewport">
        <div class="main">
          <router-view v-slot="{ Component }">
            <transition mode="out-in" name="page">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>

      <div class="copyright">
        <div class="cardButton">
          <n-button :color="themeColor" class="cButton" round @click="goTo('home')">
            <template #icon>
              <n-icon size="23">
                <Home12Regular />
              </n-icon>
            </template>
            <a>{{ homeLabel[lang] || homeLabel.en }}</a>
          </n-button>
          <n-button :color="themeColor" class="cButton" round @click="goTo('blog')">
            <template #icon>
              <n-icon size="23">
                <AnimalRabbit28Regular />
              </n-icon>
            </template>
            <a>{{ blogLabel[lang] || blogLabel.en }}</a>
          </n-button>
        </div>
      </div>
    </MessageProvider>
  </n-message-provider>
</template>

<style lang="scss">
.topBar {
  animation: upToDown 0.7s linear 0s 1;
}

.viewport {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;

  .main {
    height: 100dvh;
    animation: slide-fwd-center 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
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
