<template>
  <div>
    <n-button
      :color="themeColor"
      :style="{ '--dynamic-width': props.btnWidth }"
      class="buttonClock sync-btn"
      round
      @click="clickMemory"
    >
      <template #icon>
        <n-icon size="20">
          <Clock></Clock>
        </n-icon>
      </template>
      <a class="commonText">{{ buttonTitle }}</a>
    </n-button>
    <n-modal v-model:show="showModal">
      <n-card :title="boxTitle" class="fromTimeCard" size="huge">
        <template #header-extra>
          <n-button circle tertiary @click="showModal = false">
            <template #icon>
              <n-icon size="20">
                <Cancel></Cancel>
              </n-icon>
            </template>
          </n-button>
        </template>
        <div v-for="item in fromNow" :key="item.time" class="timeCard themeText">
          <div class="thatDay">
            <a>{{ formatDate(item.time) }}</a>
          </div>

          <a>{{ getName(item) }}</a>

          <div>
            <a>{{ formatTime(String(item.time)) }}</a>
          </div>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script lang="ts" setup>
import { NButton, NCard, NIcon, NModal } from "naive-ui";
import Clock from "../icons/clock.svg";
import { computed, onMounted, ref } from "vue";
import Cancel from "../icons/cancel.svg";
import { formatDate, formatTime, lang } from "@/components/ts/setupLang.ts";
import { themeColor } from "@/components/ts/useTheme.ts";
import fromNowI18 from "@/data/I18N/fromNowI18n.json";
import { useContentStore } from "@/components/ts/contentStore.ts";

interface Props {
  btnWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  btnWidth: "auto",
});

interface I18nBlock {
  type: string;
  content: string;
}

interface YamlTimeBlock {
  time: string | number;
  photo?: string;
  names?: I18nBlock[];
  name_zh?: string;
  name_en?: string;
  name_ja?: string;
  name_other?: string;
}

interface YamlResponse {
  fromNow: YamlTimeBlock[];
}

const fromNow = ref<YamlTimeBlock[]>([]);
const { getSingle } = useContentStore();

onMounted(async () => {
  const res = await getSingle<YamlResponse>("main", "fromNow.yaml");
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

interface LanguageConfig {
  title: string;
  button: string;
}

const data = fromNowI18 as Record<string, LanguageConfig>;

const boxTitle = computed(() => {
  return data[lang.value]?.title || data["en"].title;
});

const buttonTitle = computed(() => {
  return data[lang.value]?.button || data["zh"]?.button;
});

const showModal = ref(false);
const clickMemory = () => {
  showModal.value = showModal.value === false;
};
</script>

<style lang="scss">
.n-modal-container .fromTimeCard {
  max-height: 92dvh;
  .n-button {
    svg {
      color: var(--global-theme-color-deep) !important;
    }
  }

  .n-card-header__main {
    color: var(--global-theme-color-deep) !important;
    paint-order: stroke fill;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
  }

  .n-collapse-item__header-main {
    color: var(--global-theme-color-deep) !important;
    -webkit-text-stroke: 0.15px var(--global-theme-color-deep);
    paint-order: stroke fill;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;

    svg {
      color: var(--global-theme-color-deep) !important;
    }
  }
  .n-card__content {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .n-card-header__main {
    text-align: center;
  }
}

.n-card__content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.buttonClock {
  pointer-events: auto;
  margin-left: 1em;
  height: 2.2em;
  border: 1px solid rgba(255, 255, 255, 0.2);
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
    max-width: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    text-align: center;
    background-color: rgba(var(--global-theme-rgb-deep), 0.13) !important;
    margin: 0.5rem auto;
    padding: 0.5rem;

    a {
      -webkit-text-stroke: 0.05px var(--global-theme-color-deep);
    }
  }
}
</style>
