<template>
  <div>
    <n-button
      :color="themeColor"
      :style="{ '--dynamic-width': props.btnWidth }"
      class="buttonClock sync-btn"
      round
      @click="openModal('fromNow')"
    >
      <template #icon>
        <n-icon size="20">
          <Clock></Clock>
        </n-icon>
      </template>
      <a :lang="lang" class="commonText">{{ buttonTitle }}</a>
    </n-button>
    <n-modal
      v-model:show="showFromNowModal"
      to="#modal-target"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @mousemove="onMove"
    >
      <n-card class="fromTimeCard" :title="boxTitle" size="huge">
        <template #header-extra>
          <n-button circle tertiary @click="showFromNowModal = false">
            <template #icon>
              <n-icon size="20">
                <Cancel></Cancel>
              </n-icon>
            </template>
          </n-button>
        </template>
        <div v-for="item in fromNow" :key="item.temp_id" class="timeCard themeText">
          <time :lang="lang">{{ formatDate(item.time) }}</time>
          <strong :lang="lang">{{ getName(item) }}</strong>
          <time :lang="lang">{{ formatTime(String(item.time)) }}</time>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { NButton, NCard, NIcon, NModal } from "naive-ui";
import Clock from "../icons/clock.svg";
import { computed, onMounted, ref } from "vue";
import Cancel from "../icons/cancel.svg";
import { formatDate, formatTime, lang } from "@/components/ts/global/setupLang.ts";
import { themeColor } from "@/components/ts/global/useTheme.ts";
import fromNowI18 from "@/data/I18N/fromNowI18n.json";
import { useContentStore } from "@/components/ts/global/contentStore.ts";
import { useCardGlow } from "@/components/ts/global/animationCalculate.ts";
import { useRouteModal } from "@/components/ts/global/useRouteModal.ts";
import { FromNowLanguageConfig, FromNowYamlResponse, YamlTimeBlock } from "@/components/ts/d.ts";

const showFromNowModal = ref(false);
const { openModal } = useRouteModal({
  paramKey: "model",
  modals: {
    fromNow: showFromNowModal,
  },
});

const { onMove, onLeave, onEnter } = useCardGlow();
interface Props {
  btnWidth?: string;
}
const props = withDefaults(defineProps<Props>(), {
  btnWidth: "auto",
});

const fromNow = ref<YamlTimeBlock[]>([]);
const { getSingle } = useContentStore();

onMounted(async () => {
  const res = await getSingle<FromNowYamlResponse>("main", "fromNow.dsl");
  if (res && res.fromNow) {
    fromNow.value = res.fromNow;
  }
});

const getName = (item: YamlTimeBlock): string => {
  const { names } = item;

  if (!names || !Array.isArray(names)) return "";

  return (
    names.find((n) => n.type === lang.value)?.content ||
    names.find((n) => n.type === "en")?.content ||
    names.find((n) => n.type === "other")?.content ||
    names[0]?.content ||
    ""
  );
};

const data = fromNowI18 as Record<string, FromNowLanguageConfig>;

const boxTitle = computed(() => {
  return data[lang.value]?.title || data["en"].title;
});

const buttonTitle = computed(() => {
  return data[lang.value]?.button || data["zh"]?.button;
});
</script>

<style lang="scss">
.n-modal-container .fromTimeCard {
  --mx: -100px;
  --my: -100px;
  --opacity: 0;
  position: relative;
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
      rgba(255, 255, 255, 0.15),
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
    padding: 2px;
    -webkit-mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    mask-image: linear-gradient(#fff 0 0), linear-gradient(#fff 0 0);
    -webkit-mask-clip: content-box, border-box;
    mask-clip: content-box, border-box;
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    background: radial-gradient(
      150px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 1),
      rgba(255, 255, 255, 0.3) 30%,
      transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }
}

.buttonClock {
  pointer-events: auto;
  margin-left: 1em;
  height: 2.2em;
  border: 1px solid rgba(251, 238, 241, 0.2);
  min-width: var(--dynamic-width, auto);
  width: auto;
  @media (min-width: 301px) {
    min-width: var(--dynamic-width, auto);
  }

  @media (max-width: 300px) {
    min-width: 5em !important;
    width: 5em !important;
    padding: 0 !important;
    .n-icon {
      margin-left: 6px !important;
    }
  }

  a {
    white-space: nowrap;
    @media (max-width: 300px) {
      display: none;
    }
  }
}

.fromTimeCard {
  display: flex;
  width: 35em;
  @media (max-width: 600px) {
    max-width: 98%;
  }

  .allTimeCard {
    display: flex;
    flex-direction: column;
  }

  .timeCard {
    z-index: 3;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    text-align: center;
    background-color: rgba(var(--global-theme-rgb-deep), 0.13) !important;
    margin: 0.5rem auto;
    padding: 0.5rem;

    strong {
      font-weight: 500;
    }

    time {
      font-weight: 500;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
  }
}
</style>
