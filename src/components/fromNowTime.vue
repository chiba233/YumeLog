<template>
  <div>
    <n-button :color="themeColor" class="buttonClock" round @click="clickMemory">
      <template #icon>
        <n-icon size="20">
          <Clock></Clock>
        </n-icon>
      </template>
      <a>{{ fromNowI18[lang as keyof typeof fromNowI18]?.button || fromNowI18.zh.button }}</a>
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
        <div v-for="item in fromNow" :key="item.time" class="timeCard">
          <div class="thatDay">
            <a>{{ formatDate(item.time) }}</a>
          </div>

          <a>{{ getName(item) }}</a>

          <div>
            <a>{{ formatTime(item.time) }}</a>
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
import { formatTime, lang, themeColor } from "@/components/ts/useStorage.ts";
import fromNowI18 from "@/data/I18N/fromNowI18n.json";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";

interface YamlTimeBlock {
  name_zh: string;
  name_en: string;
  name_ja: string;
  name_other: string;
  photo: string;
  time: string;
}

interface YamlResponse {
  block: YamlTimeBlock[];
}

interface OriginalTimeBlock {
  nameZH: string;
  nameEN: string;
  nameJP: string;
  nameOther: string;
  photo: string;
  time: string;
}

const fromNow = ref<OriginalTimeBlock[]>([]);

onMounted(async () => {
  const res = await loadSingleYaml<YamlResponse>("main", "fromNow.yaml");
  if (res && res.block) {
    fromNow.value = res.block.map((item: YamlTimeBlock): OriginalTimeBlock => ({
      nameZH: item.name_zh,
      nameEN: item.name_en,
      nameJP: item.name_ja,
      nameOther: item.name_other,
      photo: item.photo,
      time: item.time,
    }));
  }
});

const langMap = {
  zh: "nameZH",
  en: "nameEN",
  ja: "nameJP",
  other: "nameOther",
} as const;

const formatDate = (t: string) => {
  return `${t.slice(0, 4)} - ${t.slice(4, 6)} - ${t.slice(6, 8)}`;
};

const getName = (item: Record<string, string>) => {
  const key = langMap[lang.value as keyof typeof langMap] || "nameEN";
  return item[key];
};

//模块分割线
interface LanguageConfig {
  title: string;
  button: string;
}

const data: Record<string, LanguageConfig> = fromNowI18;
const boxTitle = computed(() => {
  return data[lang.value]?.title || data["en"].title;
});

//模块分割线
const showModal = ref(false);
const clickMemory = () => {
  showModal.value = showModal.value === false;
};
</script>

<style lang="scss">
.n-modal-container .fromTimeCard {
  max-height: 84.4dvh;
  border-radius: 1.5em;
  background-color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

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
  @media (max-width: 300px) {
    .n-icon {
      margin-left: 6px;
    }
  }

  a {
    color: #191919;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
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
    background-color: rgba(89, 89, 89, 0.2);
    margin: 0.5rem auto;
    padding: 0.5rem;

    a {
      color: #191919;
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    }
  }
}
</style>
