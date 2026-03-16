import { computed, ref, shallowRef, watch } from "vue";
import { lang } from "@/components/ts/setupLang.ts";
import blogI18nData from "@/data/I18N/blogI18n.json";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";
import { Friend, NekoYamlResponse, Post, PostBlock, ProcessedPost, YamlNekoBlock } from "./d";
import { parseRichText, stripRichText } from "./dsl/semantic/blogFormat.ts";
import friendsMessage from "@/data/I18N/friendsMessage.json";
import { socialRawData } from "@/components/ts/setupJson.ts";
import { useYamlText } from "@/components/ts/useYamlI18n.ts";

type I18nSource = Record<string, Record<string, string>>;
export type WebTitleMap = Record<string, Record<string, string>>;
export const globalWebTitleMap = shallowRef<WebTitleMap>({});
export const showCatModel = ref<boolean>(false);
export const showMaiModal = ref<boolean>(false);
export const showWechatModel = ref<boolean>(false);
export const showLineModel = ref<boolean>(false);
export const currentPostTitle = ref<string | null>(null);
export const selectedPost = ref<Post | null>(null);
export const posts = ref<Post[]>([]);
export const showModal = ref(false);
export const friends = ref<Friend[]>([]);
export const blogDisplay = computed(() => {
  const currentLang = lang.value;
  const source = blogI18nData as Record<string, Record<string, string>>;
  const displayObj: Record<string, string> = {};

  Object.keys(source).forEach((key) => {
    const translations = source[key];
    displayObj[key] =
      translations[currentLang] ||
      translations["en"] ||
      translations["other"] ||
      Object.values(translations)[0];
  });

  return displayObj;
});
export const socialLinks = computed(() => {
  return socialRawData.value?.socialLinks ?? {};
});
export const displayTitle = useYamlText("main", "title.yaml", "title");
export const displayContent = useYamlText("main", "introduction.yaml", "introduction");

export const nekoImg = ref<YamlNekoBlock[]>([]);
export const loadCat = async () => {
  if (nekoImg.value.length) return;
  const res = await loadSingleYaml<NekoYamlResponse>("main", "neko.yaml");
  if (res && res.img) {
    nekoImg.value = res.img.map(
      (img: YamlNekoBlock): YamlNekoBlock => ({
        imgError: img.imgError,
        img: img.img,
        imgName: img.imgName,
      }),
    );
  }
};

export const getDescriptionText = (blocks?: PostBlock[]) => {
  if (!blocks) return "";
  const text = blocks
    .filter((b) => b.type === "text" || b.type === "center")
    .map((b) => (typeof b.content === "string" ? stripRichText(b.content) : ""))
    .join(" ");
  return text.slice(0, 400);
};

export const processedPosts = computed<ProcessedPost[]>(() =>
  posts.value.map((post) => {
    const blocks = post.blocks ?? [];
    const imageBlocks = blocks.filter((b) => b.type === "image");
    return {
      ...post,
      blocks,
      imageBlocks,
      displayDescription: getDescriptionText(blocks),
    };
  }),
);

export const parsedBlocks = shallowRef<PostBlock[]>([]);

watch([selectedPost, showModal], async ([newPost, isShow]) => {
  if (!isShow || !newPost?.blocks) {
    if (!import.meta.env.SSR) parsedBlocks.value = [];
    return;
  }

  const rawBlocks = newPost.blocks;
  if (import.meta.env.SSR) {
    parsedBlocks.value = rawBlocks.map((block) => {
      if (block.type === "text" && typeof block.content === "string") {
        return {
          ...block,
          tokens: parseRichText(block.content),
        };
      }

      return {
        ...block,
        tokens: [],
      };
    });
    return;
  }
  const temp: PostBlock[] = [];
  for (let i = 0; i < rawBlocks.length; i++) {
    if (!showModal.value) break;
    temp.push({ ...rawBlocks[i], tokens: [] });

    if (i % 10 === 0 || i === rawBlocks.length - 1) {
      parsedBlocks.value = [...temp];
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
});

export const friendsTitle = computed(() => {
  const source = friendsMessage as I18nSource;
  return {
    title: source.title[lang.value] ?? source.title.en,
  };
});

export const platforms = computed(() => {
  return socialRawData.value?.platforms ?? [];
});
