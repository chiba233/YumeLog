<script setup lang="ts">
import { RouterView, useRoute, useRouter } from "vue-router";
import { computed, onMounted, onServerPrefetch, watch } from "vue";
import { NButton, NIcon, NMessageProvider } from "naive-ui";
import { Document28Regular, Home12Regular } from "@vicons/fluent";
import MessageProvider from "@/shared/components/MessageProvider.vue";
import TopBar from "@/shared/components/topBar.vue";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { themeColor } from "@/shared/lib/app/useTheme.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { personRawData, socialRawData } from "@/shared/lib/app/setupJson.ts";
import ClientOnly from "@/shared/components/ClientOnly.vue";
import { useCardGlow } from "@/shared/lib/app/animationCalculate.ts";
import { changeSpareUrl, listPrimaryError } from "@/shared/lib/yaml";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import {
  blogDisplay,
  currentPostTitle,
  globalWebTitleMap,
  showCatModel,
  showLineModel,
  showMaiModal,
  showWechatModel,
} from "@/shared/lib/app/useGlobalState.ts";
import { useHead } from "@unhead/vue";
import webTitle from "@/data/I18N/webTitle.json";
import { PersonConfig, SocialConfig } from "@/shared/types/social.ts";
import { loadPublicJson } from "@/shared/lib/app/publicData.ts";

interface TitleEntry {
  [key: string]: string;
}

const route = useRoute();
const webTitleData = webTitle as Record<string, TitleEntry>;
onMounted(async () => {
  if (route.query.invalid) {
    const i18nSource = commonI18n.invalidAccess as Record<string, string>;
    const warningMsg = i18nSource[lang.value] || i18nSource["en"];
    $message.error(warningMsg, true, 3000);
    await router.replace({
      path: route.path,
      query: {},
    });
  }
});

const dynamicTitle = computed(() => {
  const currentLang = lang.value;
  const routeName = (route.name as string) || "home";
  const baseTitle = globalWebTitleMap.value[routeName]?.[currentLang] || routeName;

  if (routeName === "blog" && currentPostTitle.value) {
    return `${currentPostTitle.value} - ${baseTitle}`;
  }

  const modals = [
    { active: showWechatModel.value, data: webTitleData.weChat },
    { active: showCatModel.value, data: webTitleData.neko },
    { active: showLineModel.value, data: webTitleData.line },
    { active: showMaiModal.value, data: webTitleData.maimai },
  ];

  if (routeName === "home") {
    const active = modals.find((m) => m.active);
    if (active) {
      const sub = active.data[currentLang] || active.data.en;
      return `${sub} - ${baseTitle}`;
    }
  }

  return baseTitle;
});
useHead({
  title: dynamicTitle,
  meta: [
    {
      property: "og:title",
      content: dynamicTitle,
    },
    {
      property: "og:site_name",
      content: computed(
        () =>
          globalWebTitleMap.value["home"]?.[lang.value] ||
          globalWebTitleMap.value["home"]?.en ||
          "",
      ),
    },
    {
      property: "og:locale",
      content: computed(() => lang.value || "en"),
    },
  ],
});

type ColorData = Record<string, string>;
const { onMove, onLeave, onEnter } = useCardGlow();
const router = useRouter();

const initData = async () => {
  try {
    const titleTask =
      loadPublicJson<Record<string, Record<string, string>>>("data/main/webTitle.json");
    const socialTask = loadPublicJson<SocialConfig>("data/config/socialLinks.json");
    const personTask = loadPublicJson<PersonConfig>("data/main/person.json");
    const colorTask: Promise<ColorData | null> = import.meta.env.SSR
      ? Promise.resolve(null)
      : loadPublicJson<ColorData>("data/config/colorData.json");

    const [titleData, socialData, personData, colorData] = await Promise.all([
      titleTask,
      socialTask,
      personTask,
      colorTask,
    ] as const);

    if (socialData) {
      socialRawData.value = socialData;
    }
    if (personData) {
      personRawData.value = personData;
    }
    if (titleData) {
      globalWebTitleMap.value = titleData;
    }

    if (!import.meta.env.SSR && colorData) {
      const keys = Object.keys(colorData);
      if (keys.length > 0) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        const themeKey = `background${randomIndex}`;
        const selectedColor = colorData[themeKey];

        if (selectedColor) {
          themeColor.value = selectedColor;
          applyThemeToDOM(randomIndex, selectedColor);
        }
      }
    }
  } catch (e) {
    $message.error(
      `Initialization failed: ${e instanceof Error ? e.message : String(e)}`,
      true,
      3000,
    );
  }
};

const applyThemeToDOM = (index: number, color: string) => {
  if (import.meta.env.SSR) return;
  const bg = document.getElementById("bg");
  if (bg) bg.style.backgroundImage = `url(/background/background${index}.webp)`;
  document.body.style.backgroundColor = color;
};

if (import.meta.env.SSR) {
  onServerPrefetch(async () => {
    await initData();
  });
}

onMounted(async () => {
  await initData();
});

const goTo = (name: string) => router.push({ name });

const homeLabel = commonI18n.bottomToolBarHome as Record<string, string>;
const blogLabel = commonI18n.bottomToolbarHome as Record<string, string>;

watch(
  () => changeSpareUrl.value,
  (v) =>
    v &&
    !listPrimaryError.value &&
    $message.warning(blogDisplay.value.changeToSpareUrl, true, 3000),
);
</script>
<template>
  <n-message-provider>
    <MessageProvider>
      <ClientOnly>
        <top-bar class="topBar"></top-bar>
      </ClientOnly>
      <div class="viewport">
        <div class="main">
          <router-view v-slot="{ Component }">
            <transition mode="out-in" name="page">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
      <div class="copyright" @mouseenter="onEnter" @mouseleave="onLeave" @mousemove="onMove">
        <div class="cardButton">
          <div class="cardButton">
            <a href="/" class="seo-link-wrapper" @click.prevent="goTo('home')">
              <n-button :color="themeColor" class="bottomButton" round>
                <template #icon>
                  <n-icon size="23">
                    <Home12Regular />
                  </n-icon>
                </template>
                <span :lang="lang" class="commonText">{{ homeLabel[lang] || homeLabel.en }}</span>
              </n-button>
            </a>

            <a href="/blog" class="seo-link-wrapper" @click.prevent="goTo('blog')">
              <n-button :color="themeColor" class="bottomButton" round>
                <template #icon>
                  <n-icon size="23">
                    <Document28Regular />
                  </n-icon>
                </template>
                <span :lang="lang" class="commonText">{{ blogLabel[lang] || blogLabel.en }}</span>
              </n-button>
            </a>
          </div>
        </div>
      </div>
    </MessageProvider>
  </n-message-provider>
</template>

<style lang="scss">
figure {
  margin: 0;
  padding: 0;
}

.seo-link-wrapper {
  text-decoration: none;
  display: contents;
  color: inherit;
}

.n-modal-mask {
  background-color: rgba(var(--global-theme-rgb-deep), 0.15) !important;
  backdrop-filter: saturate(110%) blur(5px);
  max-height: 100dvh;
}

.n-image-preview-overlay {
  background-color: rgba(var(--global-theme-rgb-deep), 0.4);
}

.n-image-preview-toolbar {
  background-color: rgba(var(--global-theme-rgb-deep), 0.4) !important;
  backdrop-filter: saturate(110%) blur(25px);
}

.n-scrollbar-content {
  max-height: 100dvh;
}

.n-modal-container .n-card {
  background-color: rgba(251, 238, 241, 0.65);
  border-radius: 20px !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  backdrop-filter: saturate(150%) blur(25px);
  max-height: 99dvh;
  max-width: 99%;

  .n-card-header {
    padding: 1em 1.3em 0.5em !important;
  }

  .n-card-header__main {
    color: var(--global-theme-color-deep) !important;
    font-weight: bold;
    paint-order: stroke fill;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
  }

  .n-card-header__main {
    text-align: center;
  }

  .n-card__content {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .n-button {
    --n-color: rgba(var(--global-theme-rgb-deep), 0.1);

    &:focus,
    &:active,
    &:hover {
      --n-color: rgba(var(--global-theme-rgb-deep), 0.25) !important;
    }

    svg {
      color: var(--global-theme-color-deep) !important;
    }
  }

  @media (max-width: 500px) {
    max-width: 98% !important;
  }

  .n-card-content {
    flex: 1;
    overflow-y: auto !important;
    overflow-x: hidden;

    display: block;
    min-height: 0;
    scrollbar-gutter: stable both-edges;

    .n-collapse-item__header-main {
      color: var(--global-theme-color-deep) !important;
      font-weight: 500;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;

      .n-base-icon {
        svg {
          color: var(--global-theme-color-deep) !important;
          stroke-width: 0.2px;
          stroke: currentColor;
        }
      }
    }

    &::-webkit-scrollbar {
      width: 6px !important;
      display: block !important;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(var(--global-theme-rgb-deep), 0.3);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-track {
      background-color: rgba(var(--global-theme-rgb-deep), 0.1);
    }

    padding: 0.2em 1rem 1em !important;
    -webkit-overflow-scrolling: touch;
  }
}

:root {
  --glass-bg: var(--global-theme-glass);
  --glass-border: 1px solid var(--global-theme-glass);
  --glass-blur: saturate(110%) blur(25px);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
}

.themeText {
  color: var(--global-theme-color-deep) !important;
}

.commonText {
  color: var(--glass-font-color);
  text-shadow: var(--glass-text-shadow);
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.topBar {
  animation: upToDown 0.7s linear 0s 1;
}

.viewport {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 6px !important;
    display: block !important;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(248, 240, 244, 0.45);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(248, 240, 244, 0.1);
  }

  .main {
    height: 100dvh;
    animation: slide-fwd-center 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }
}

.copyright {
  left: 0.6em;
  right: 0.6em;
  background-color: rgba(251, 238, 241, 0.1);
  border: 1px solid rgba(251, 238, 241, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-radius: 1.4em;
  backdrop-filter: saturate(110%) blur(5px);
  -webkit-backdrop-filter: saturate(110%) blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 3em;
  position: absolute;
  animation: downToUp 0.7s linear 0s 1;
  z-index: 2;
  pointer-events: auto;
  bottom: calc(0.45em + env(safe-area-inset-bottom));

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

  .cardButton {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 1em;
  }

  .bottomButton {
    width: 100%;
    height: 2.2em;
    border: 1px solid rgba(251, 238, 241, 0.2);
    margin-right: 0;
    display: flex;
    z-index: 3;
    justify-content: center;
    pointer-events: auto;
    @media (max-width: 300px) {
      .n-icon {
        margin-left: 6px;
      }
    }

    a {
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

  .n-message {
    --n-border: none !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    transition:
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s !important;
  }

  .n-message.n-message--info-type {
    --n-color: rgba(235, 245, 255, 0.6) !important;
    --n-content-text-color: #2080f0 !important;
    --n-icon-color: #2080f0 !important;
    background-color: var(--n-color) !important;
  }

  .n-message.n-message--success-type {
    --n-color: rgba(237, 247, 242, 0.6) !important;
    --n-content-text-color: #18a058 !important;
    --n-icon-color: #18a058 !important;
    background-color: var(--n-color) !important;
  }

  .n-message.n-message--error-type {
    --n-color: rgba(254, 240, 240, 0.6) !important;
    --n-content-text-color: #d03050 !important;
    --n-icon-color: #d03050 !important;
    background-color: var(--n-color) !important;
  }

  .n-message.n-message--loading-type {
    --n-color: rgba(255, 255, 255, 0.7) !important;
    --n-content-text-color: #333 !important;
    --n-icon-color: #18a058 !important;
    background-color: var(--n-color) !important;
  }

  .n-message.n-message--warning-type {
    --n-color: rgba(251, 238, 241, 0.6) !important;
    --n-content-text-color: #333 !important;
    --n-icon-color: #f0a020 !important;
    background-color: var(--n-color) !important;
  }
}
</style>
