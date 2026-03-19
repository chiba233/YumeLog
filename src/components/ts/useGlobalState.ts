import { computed, ref, shallowRef, watch } from "vue";
import { lang } from "@/components/ts/setupLang.ts";
import blogI18nData from "@/data/I18N/blogI18n.json";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";
import { Friend, NekoYamlResponse, Post, PostBlock, ProcessedPost, YamlNekoBlock } from "./d";
import { parseRichText, stripRichText } from "./dsl/semantic/blogFormat.ts";
import friendsMessage from "@/data/I18N/friendsMessage.json";
import { socialRawData } from "@/components/ts/setupJson.ts";

type I18nSource = Record<string, Record<string, string>>;
export type WebTitleMap = Record<string, Record<string, string>>;
export const globalWebTitleMap = shallowRef<WebTitleMap>({});
export const showCatModel = ref<boolean>(false);
export const showMaiModal = ref<boolean>(false);
export const showWechatModel = ref<boolean>(false);
export const showLineModel = ref<boolean>(false);
export const currentPostTitle = ref<string | null>(null);
export const selectedPost = ref<Post | null>(null);
export const posts = shallowRef<Post[]>([]);
export const showModal = ref(false);
export const friends = shallowRef<Friend[]>([]);
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

export const nekoImg = shallowRef<YamlNekoBlock[]>([]);
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

export const getDescriptionText = (blocks?: PostBlock[], targetLength = 160): string => {
  if (!blocks || blocks.length === 0) return "";
  let result = "";
  for (const block of blocks) {
    if (block.type === "text") {
      const content = block.content;
      if (typeof content === "string" && content.trim().length > 0) {
        const strippedBlock = stripRichText(content);
        if (strippedBlock.length > 0) {
          result += (result ? " " : "") + strippedBlock;
        }
        if (result.length >= targetLength) {
          break;
        }
      }
    }
  }

  if (result.length > targetLength) {
    return result.slice(0, targetLength).trim() + "...";
  }

  return result.trim();
};

const descriptionCache = new WeakMap<object, string>();

export const processedPosts = computed<ProcessedPost[]>(() => {
  if (!posts.value) return [];
  return posts.value.map((post) => {
    const blocks = post.blocks ?? [];
    const imageBlocks = blocks.filter((b) => b.type === "image");
    let description = descriptionCache.get(post);
    if (description === undefined) {
      description = getDescriptionText(blocks, 350);
      descriptionCache.set(post, description);
    }
    return {
      ...post,
      blocks,
      imageBlocks,
      displayDescription: description,
    } as ProcessedPost;
  });
});

export const parsedBlocks = shallowRef<PostBlock[]>([]);

watch([selectedPost, showModal], async ([newPost, isShow]) => {
  if (!isShow || !newPost?.blocks) {
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
