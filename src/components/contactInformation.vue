<template>
  <n-modal v-model:show="showCatModel">
    <!-- catCard -->
    <n-card :title="catMemoryTitle.catMemory" class="catCard" size="huge">
      <template #header-extra>
        <n-button circle tertiary @click="showCatModel = false">
          <template #icon>
            <n-icon size="20">
              <Cancel></Cancel>
            </n-icon>
          </template>
        </n-button>
      </template>
      <div>
        <n-image-group class="catImgCard">
          <div v-for="item in nekoImg" :key="item.imgName" class="catImgDIV">
            <n-image
              :alt="item.imgName"
              :fallback-src="item.imgError"
              :src="item.img"
              width="160"
            ></n-image>
            <a>{{ item.imgName }}</a>
          </div>
        </n-image-group>
      </div>
    </n-card>
  </n-modal>
  <!-- maiCard -->
  <n-modal v-model:show="showMaiModal">
    <n-card :title="maiDisplay.titleName" class="maiCard" size="huge">
      <template #header-extra>
        <n-button circle tertiary @click="showMaiModal = false">
          <template #icon>
            <n-icon size="20">
              <Cancel />
            </n-icon>
          </template>
        </n-button>
      </template>

      <n-collapse :default-expanded-names="['1']" accordion class="maiCollapse">
        <n-collapse-item
          v-for="section in maiSections"
          :key="section.name"
          :name="section.name"
          :title="maiDisplay[section.titleKey]"
        >
          <div v-for="item in section.items" :key="item.label" class="maiCardDiv">
            <a>{{ maiDisplay[item.label] }}</a>
            <a class="connecter">:</a>
            <a>{{ getStatValue(item.value) }}</a>
          </div>
        </n-collapse-item>
      </n-collapse>
    </n-card>
  </n-modal>
  <!-- 以下是WeCat -->
  <n-image-preview v-model:show="showWechatModel" src="/wechat.webp" width="1"></n-image-preview>
  <n-image-preview v-model:show="showLineModel" src="/line.webp" width="1"></n-image-preview>

  <!-- 以下是联系人 -->
  <div class="contacts">
    <n-button
      v-for="item in platforms"
      :key="item.id"
      :color="themeColor"
      class="cButton"
      round
      @click="handleContactClick(item)"
    >
      <template #icon>
        <n-icon size="23">
          <component :is="iconMap[item.id]" />
        </n-icon>
      </template>
      <a>{{ getLabel(item) }}</a>
    </n-button>
  </div>
</template>

<script lang="ts" setup>
import Solana from "@/icons/solanaLogoMark.svg";
import Cat from "@/icons/cat.svg";
import TwitterIcon from "@/icons/twitter.svg";
import TelegramIcon from "@/icons/telegram.svg";
import MaiTrans from "@/icons/maitrans.svg";
import Tron from "@/icons/tron.svg";
import Eth from "@/icons/eth.svg";
import Bsc from "@/icons/binance-coin-bnb-seeklogo.svg";
import Email from "@/icons/Email.svg";
import Github from "@/icons/LogoGithub.svg";
import Polygon from "@/icons/polygon-matic-logo.svg";
import Arbitrum from "@/icons/arb.svg";
import wechat from "@/icons/wechat.svg";
import Line from "@/icons/line.svg";
import Cancel from "@/icons/cancel.svg";
import commonI18n from "@/data/I18N/commonI18n.json";
import maiI18nData from "@/data/I18N/maiI18n.json";

import { computed, onMounted, ref, shallowRef } from "vue";
import {
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NIcon,
  NImage,
  NImageGroup,
  NImagePreview,
  NModal,
} from "naive-ui";
import axios from "axios";
import { useAsyncState, useStorage } from "@vueuse/core";
import { lang, themeColor } from "@/components/ts/useStorage.ts";
import { getMaiUrl, type UserDataType } from "./ts/maimaiScore";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";

type PlatformId =
  | "telegram"
  | "wechat"
  | "line"
  | "email"
  | "twitter"
  | "github"
  | "tron"
  | "eth"
  | "areth"
  | "bsc"
  | "polygon"
  | "solana"
  | "maimai"
  | "cat";

type InteractionType = "link" | "modal" | "func";

interface PlatformConfig {
  id: PlatformId;
  label: string;
  type: InteractionType;
}

interface SocialConfig {
  platforms: PlatformConfig[];
  socialLinks: Record<string, string>;
}

const platformRawData = shallowRef<SocialConfig | null>(null);

fetch("/data/config/socialLinks.json")
  .then((res) => res.json() as Promise<SocialConfig>)
  .then((data) => {
    platformRawData.value = data;
  })
  .catch((err) => {
    console.error(err);
  });

const platforms = computed(() => {
  return platformRawData.value?.platforms ?? [];
});
const socialLinks = computed(() => {
  return platformRawData.value?.socialLinks ?? {};
});

const showCatModel = ref<boolean>(false);
const showMaiModal = ref<boolean>(false);
const showWechatModel = ref<boolean>(false);
const showLineModel = ref<boolean>(false);
const maiError = ref<string>("Error");

const maiStorage = useStorage<{ data: Partial<UserDataType>; updatedAt: number }>(
  "mai-user-data-cache",
  { data: {}, updatedAt: 0 },
);

const { state: data } = useAsyncState<Partial<UserDataType>>(async () => {
  const now = Date.now();
  if (
    Object.keys(maiStorage.value.data).length > 0 &&
    now - maiStorage.value.updatedAt < 86400000
  ) {
    return maiStorage.value.data;
  }

  const url = await getMaiUrl();
  return axios.get<UserDataType>(url).then((res) => {
    maiStorage.value = { data: res.data, updatedAt: now };
    return res.data;
  });
}, maiStorage.value.data);

const iconMap: Record<PlatformId, string> = {
  telegram: TelegramIcon,
  wechat: wechat,
  line: Line,
  email: Email,
  twitter: TwitterIcon,
  github: Github,
  tron: Tron,
  eth: Eth,
  areth: Arbitrum,
  bsc: Bsc,
  polygon: Polygon,
  solana: Solana,
  maimai: MaiTrans,
  cat: Cat,
};

type I18nSource = Record<string, Record<string, string>>;
const catMemoryTitle = computed(() => {
  const source = commonI18n as I18nSource;

  return {
    catMemory: source.catMemoryTitle[lang.value] ?? source.catMemoryTitle.en,
    cat: source.cat[lang.value] ?? source.cat.en,
  };
});

interface MaiSectionItem {
  label: string;
  value: string;
}

interface MaiSection {
  titleKey: string;
  name: string;
  items: MaiSectionItem[];
}

const maiSections: MaiSection[] = [
  {
    titleKey: "mainInfo",
    name: "1",
    items: [
      { label: "dxName", value: "userName" },
      { label: "dxRatingName", value: "playerRating" },
      { label: "dxLastPlay", value: "lastPlayDate" },
      { label: "dxPlayCount", value: "playCount" },
      { label: "dxVersion", value: "lastDataVersion" },
    ],
  },
  {
    titleKey: "otherInfo",
    name: "2",
    items: [
      { label: "BasicDeluxscore", value: "totalBasicDeluxscore" },
      { label: "AdvancedDeluxscore", value: "totalAdvancedDeluxscore" },
      { label: "ExpertDeluxscore", value: "totalExpertDeluxscore" },
      { label: "MasterDeluxscore", value: "totalMasterDeluxscore" },
      { label: "ReMasterDeluxscore", value: "totalReMasterDeluxscore" },
      { label: "totalDeluxscore", value: "totalDeluxscore" },
    ],
  },
  {
    titleKey: "historyInfo",
    name: "3",
    items: [{ label: "highestRating", value: "highestRating" }],
  },
];

const maiDisplay = computed(() => {
  const source = maiI18nData as Record<string, Record<string, string>>;
  const result: Record<string, string> = {};
  for (const key in source) {
    result[key] = source[key][lang.value] || source[key].en;
  }
  return result;
});
const getStatValue = (key: string): string | number => {
  const stats = data.value as Record<string, string | number | undefined>;
  const result = stats[key];
  return result !== null && result !== undefined && result !== "" ? result : maiError.value;
};

const handleContactClick = (item: PlatformConfig): void => {
  const links = socialLinks.value;
  const url = links[item.id as keyof typeof links];
  const actions: Record<InteractionType, () => void> = {
    link: () => {
      if (url) {
        window.open(url);
      } else {
        console.warn(`找不到 ID 为 ${item.id} 的社交链接！`);
      }
    },
    modal: () => {
      if (item.id === "wechat") showWechatModel.value = true;
      if (item.id === "line") showLineModel.value = true;
    },
    func: () => {
      if (item.id === "maimai") showMaiModal.value = true;
      if (item.id === "cat") showCatModel.value = true;
    },
  };

  const action = actions[item.type];
  if (action) action();
};

const getLabel = (item: PlatformConfig): string => {
  if (item.id === "maimai") return `DX ${data.value?.playerRating ?? maiError.value}`;
  if (item.id === "cat") return catMemoryTitle.value.cat;
  return item.label;
};

interface YamlNekoBlock {
  imgError: string;
  img: string;
  imgName: string;
}

interface YamlResponse {
  img: YamlNekoBlock[];
}

interface OriginalNekoBlock {
  imgError: string;
  img: string;
  imgName: string;
}

const nekoImg = ref<OriginalNekoBlock[]>([]);
onMounted(async () => {
  const res = await loadSingleYaml<YamlResponse>("main", "neko.yaml");
  if (res && res.img) {
    nekoImg.value = res.img.map(
      (img: YamlNekoBlock): OriginalNekoBlock => ({
        imgError: img.imgError,
        img: img.img,
        imgName: img.imgName,
      }),
    );
  }
});
</script>

<style lang="scss">
.n-modal-container .maiCard,
.n-modal-container .catCard {
  max-height: 84.4dvh;
  border-radius: 1.5em;
  background-color: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);

  .n-card__content {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .n-card-header__main {
    text-align: center;
  }
}

.catCard .n-card__content div:has(> .catImgDIV) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  gap: 0.3em 0.65rem;
  justify-content: center !important;
}

.catImgDIV {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: end;

  img {
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  a {
    margin-top: 0.4rem;
    margin-bottom: 0.2rem;
    text-align: center;
    font-size: 0.85rem;
    color: #e6e6e6;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
    text-decoration: none;
  }
}

.catCard {
  max-width: 48em;
  @media (max-width: 600px) {
    max-width: 98%;
  }
}

.maiCard {
  display: flex;
  width: 42em;
  @media (max-width: 600px) {
    max-width: 98%;
  }

  .connecter {
    padding-right: 0.6em;
    padding-left: 0.2em;
  }

  a {
    padding-bottom: 1em;
  }

  .maiCardDiv {
    display: flex;
    justify-content: center;
    height: auto;
    object-fit: scale-down;

    a {
      color: #191919;
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    }
  }
}

.contacts {
  display: flex;
  justify-content: center;
  flex-direction: row;
  flex-wrap: wrap;

  .cButton {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);

    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    &:focus {
      background: rgba(255, 255, 255, 0.5);
      outline: none;
    }

    &:active {
      background: rgba(255, 255, 255, 0.5);
    }
  }

  .n-button {
    height: 2.2em;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin: 0.5rem;

    a {
      color: #191919;
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
      margin-left: 4px;
    }

    @media (min-width: 550px) {
      width: 8.8em;
    }
    @media (max-width: 550px) {
      .n-icon {
        margin-left: 6px;
      }
      width: 3.9em;
      display: flex;
      justify-content: center;
      align-content: center;
    }

    a {
      @media (max-width: 550px) {
        display: none;
      }
    }
  }
}
</style>
