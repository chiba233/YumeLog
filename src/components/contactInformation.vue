<template>
  <n-modal
    v-model:show="showCatModel"
    to="#modal-target"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMove"
  >
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
      <div class="catMainCard">
        <n-image-group>
          <div v-for="item in nekoImg" :key="item.imgName" class="catImgDIV">
            <figure>
              <n-image
                :alt="item.imgName"
                :fallback-src="item.imgError"
                :src="item.img"
                width="160"
              ></n-image>
              <figcaption :lang="lang" class="themeText">{{ item.imgName }}</figcaption>
            </figure>
          </div>
        </n-image-group>
      </div>
    </n-card>
  </n-modal>
  <!-- maiCard -->
  <n-modal
    v-model:show="showMaiModal"
    :block-scroll="false"
    to="#modal-target"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMove"
  >
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
            <span :lang="lang" class="themeText">{{ maiDisplay[item.label] }}</span>
            <span :lang="lang" class="connecter themeText">:</span>
            <span :lang="lang" class="themeText">{{ getStatValue(item.value) }}</span>
          </div>
        </n-collapse-item>
      </n-collapse>
    </n-card>
  </n-modal>

  <!-- 以下是WeCat -->
  <n-image-preview v-model:show="showWechatModel" src="/wechat.webp" />

  <n-image-preview v-model:show="showLineModel" src="/line.webp" />

  <!-- 以下是联系人 -->
  <div class="contacts">
    <n-button
      v-for="item in platforms ?? []"
      :key="item.id"
      :aria-labelledby="getLabel(item)"
      :color="themeColor"
      class="cButton glass"
      round
      @click="handleContactClick(item)"
    >
      <template #icon>
        <n-icon size="23">
          <component :is="iconMap[item.id]" />
        </n-icon>
      </template>
      <a :lang="lang" class="commonText">
        {{ getLabel(item) }}
      </a>
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

import { computed, nextTick, ref, watch } from "vue";
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
import { lang } from "@/components/ts/setupLang.ts";
import { themeColor } from "@/components/ts/useTheme.ts";
import { getMaiUrl, type UserDataType } from "./ts/maimaiScore";
import {
  maiSections,
  PlatformConfig,
  PlatformId,
  socialRawData,
} from "@/components/ts/setupJson.ts";
import { useHead } from "@unhead/vue";
import { useCardGlow } from "@/components/ts/animationCalculate.ts";
import {
  loadCat,
  nekoImg,
  showCatModel,
  showLineModel,
  showMaiModal,
  showWechatModel,
} from "./ts/useGlobalState.ts";
import { $message } from "./ts/msgUtils.ts";
import { useRouteModal } from "./ts/useRouteModal.ts";

type I18nMap = Record<string, string>;

const { onMove, onLeave, onEnter } = useCardGlow();
const platforms = computed(() => {
  return socialRawData.value?.platforms ?? [];
});
const socialLinks = computed(() => {
  return socialRawData.value?.socialLinks ?? {};
});
const syncContactWidth = () => {
  if (import.meta.env.SSR) return;
  const buttons = document.querySelectorAll<HTMLElement>(".cButton");
  if (!buttons.length) return;
  let max = 0;
  buttons.forEach((el) => {
    const oldWidth = el.style.width;
    const oldMinWidth = el.style.minWidth;
    el.style.width = "auto";
    el.style.minWidth = "auto";
    const w = el.offsetWidth;
    if (w > max) max = w;
    el.style.width = oldWidth;
    el.style.minWidth = oldMinWidth;
  });
  buttons.forEach((el) => {
    el.style.minWidth = `${max}px`;
  });
};
watch(
  [platforms, lang],
  async () => {
    await nextTick();
    syncContactWidth();
  },
  { immediate: true },
);

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
    wechat: source.weChat[lang.value] ?? source.weChat.en,
    email: source.email[lang.value] ?? source.email.en,
    twitter: source.twitter[lang.value] ?? source.twitter.en,
  };
});

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

const { openModal } = useRouteModal({
  paramKey: "card",
  modals: {
    maimai: showMaiModal,
    cat: showCatModel,
    wechat: showWechatModel,
    line: showLineModel,
  },
  loadHandlers: {
    cat: async () => {
      await loadCat();
    },
  },
});
const handleContactClick = async (item: PlatformConfig): Promise<void> => {
  if (item.type === "link") {
    const url = socialLinks.value[item.id as keyof typeof socialLinks.value];
    if (url) {
      window.open(url);
    } else {
      const socialEntry = commonI18n.socialLinkNotFound as I18nMap;
      const socialMsg = (socialEntry[lang.value] || socialEntry.en).replace("{id}", item.id);
      $message.warning(socialMsg, true, 3000);
    }
    return;
  }
  await openModal(item.id);
};

const getLabel = (item: PlatformConfig): string => {
  if (item.id === "maimai") return `DX ${data.value?.playerRating ?? maiError.value}`;
  if (item.id === "cat") return catMemoryTitle.value.cat;
  if (item.id === "wechat") return catMemoryTitle.value.wechat;
  if (item.id === "email") return catMemoryTitle.value.email;
  if (item.id === "twitter") return catMemoryTitle.value.twitter;
  return item.label;
};

const siteOrigin = import.meta.env.SSR ? import.meta.env.VITE_SSR_SITE_URL : window.location.origin;
const headLinks = computed(() => {
  const links = socialLinks.value;

  const social = platforms.value
    .filter((p) => p.type === "link" && links[p.id as keyof typeof links])
    .map((p) => ({
      rel: "me",
      href: links[p.id as keyof typeof links],
      title: p.label,
    }));
  return [
    ...social,
    {
      rel: "canonical",
      href: `${siteOrigin}/blog`,
      title: "Blog",
    },
    {
      property: "og:url",
      content: siteOrigin,
    },
  ];
});
useHead({
  link: headLinks,
  meta: [
    {
      name: "maimai-rating",
      content: computed(() => data.value?.playerRating?.toString() || ""),
    },
  ],
});
watch([showWechatModel, showLineModel], async ([wechat, line]) => {
  if (!wechat && !line) return;

  await nextTick();

  const overlay = document.querySelector(".n-image-preview-overlay");
  overlay?.classList.add("contacts-overlay");
});
</script>

<style lang="scss">
.n-modal-container .maiCard,
.n-modal-container .catCard {
  max-height: 92dvh;
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
      300px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 0.12),
      transparent 65%
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
      180px circle at var(--mx) var(--my),
      rgba(251, 238, 241, 0.75),
      rgba(251, 238, 241, 0.25) 30%,
      transparent 70%
    );

    z-index: 2;
    opacity: var(--opacity);
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

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

.catMainCard {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  gap: 0.3em 0.65rem;
  justify-content: center !important;
  width: 100%;
}

.catImgDIV {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: end;

  img {
    z-index: 3;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  figcaption {
    margin-top: 0.4rem;
    margin-bottom: 0.2rem;
    text-align: center;
    font-size: 0.85rem;
    text-decoration: none;
    -webkit-text-stroke: 0.15px var(--global-theme-color-deep);
    font-weight: Normal;
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

  span {
    padding-bottom: 1em;
  }

  .maiCardDiv {
    display: flex;
    justify-content: center;
    height: auto;
    object-fit: scale-down;

    span {
      -webkit-text-stroke: 0.05px var(--global-theme-color-deep);
    }
  }
}

.contacts-overlay {
  background-color: rgba(var(--global-theme-rgb-deep), 0.2) !important;
  backdrop-filter: blur(3px);
  max-height: 100dvh;
}

.contacts {
  display: flex;
  justify-content: center;
  flex-direction: row;
  flex-wrap: wrap;

  .cButton {
    height: 2.2em;
    margin: 0.5rem;
    border: 1px solid rgba(251, 238, 241, 0.2);

    &:focus,
    &:active,
    &:hover {
      background: rgba(255, 255, 255, 0.5);
      outline: none;
    }

    a {
      font-weight: normal;
      margin-left: 3px;
    }

    @media (min-width: 550px) {
    }
    @media (max-width: 550px) {
      .n-icon {
        margin-left: 6px;
      }
      min-width: 0 !important;
      width: 3.9em !important;
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
