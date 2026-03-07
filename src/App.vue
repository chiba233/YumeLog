<script lang="ts" setup>
import { RouterView, useRoute, useRouter } from "vue-router"; // 👈 追加了 useRoute！
import { computed, onMounted, watch } from "vue"; // 删除了无用的 ref
import { NButton, NIcon, NMessageProvider } from "naive-ui";
import { AnimalRabbit28Regular, Home12Regular } from "@vicons/fluent";
import MessageProvider from "@/components/MessageProvider.vue";
import TopBar from "@/components/topBar.vue";
import { lang, themeColor } from "@/components/ts/useStorage.ts";
import { dynamicTitlePrefix, globalWebTitleMap } from "./components/ts/useTitleState";
import commonI18n from "@/data/I18N/commonI18n.json";

type ColorData = Record<string, string>;

const router = useRouter();
const route = useRoute();

onMounted(async () => {
  try {
    const [colorRes, titleRes] = await Promise.all([
      fetch("/data/config/colorData.json"),
      fetch("/data/main/webTitle.json"),
    ]);

    if (colorRes.ok) {
      const colorData = await colorRes.json() as ColorData;
      const keys = Object.keys(colorData);
      if (keys.length > 0) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        const themeKey = `background${randomIndex}`;
        const selectedColor = colorData[themeKey];

        if (selectedColor) {
          themeColor.value = selectedColor;
          const bg = document.getElementById("bg");
          if (bg) bg.style.backgroundImage = `url(/background${randomIndex}.webp)`;
          document.body.style.backgroundColor = selectedColor;
        }
      }
    } else {
      console.warn("颜色配置加载异常");
    }

    if (titleRes.ok) {
      globalWebTitleMap.value = await titleRes.json() as Record<string, Record<string, string>>;
    } else {
      console.warn("标题配置加载异");
    }

  } catch (e) {
    console.error("全局初始化失败:", e);
  }
});

const currentDisplayTitle = computed(() => {
  const pageKey = (route.name as string) || "home";
  const baseTitle = globalWebTitleMap.value[pageKey]?.[lang.value] || "My Website";
  if (dynamicTitlePrefix.value) {
    return `${dynamicTitlePrefix.value} - ${baseTitle}`;
  }
  return baseTitle;
});

watch(currentDisplayTitle, (newVal: string) => {
  document.title = newVal;
}, { immediate: true });

watch(() => route.path, () => {
  dynamicTitlePrefix.value = "";
});

const goTo = (name: string) => router.push({ name });

const homeLabel = commonI18n.bottonToolBarHome as Record<string, string>;
const blogLabel = commonI18n.bottomToolbarHome as Record<string, string>;
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

.page-leave-active {
  animation: none;
}

.n-message-container {
  margin-top: 4em;

  .n-message.n-message--warning-type {
    --n-border: none !important;
    --n-color: rgba(251, 238, 241, 0.6) !important;
    background-color: var(--n-color) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    --n-content-text-color: #333 !important;
    --n-icon-color: #d03050 !important;
    transition: transform 0.3s cubic-bezier(.4, 0, .2, 1), opacity 0.3s !important;
  }
}
</style>
