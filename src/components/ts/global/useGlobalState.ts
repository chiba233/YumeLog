import { computed, ref, shallowRef, watch } from "vue";
import { lang } from "@/components/ts/global/setupLang.ts";
import blogI18nData from "@/data/I18N/blogI18n.json";
import { loadSingleYaml } from "@/components/ts/getYaml";
import { Friend, NekoYamlResponse, Post, PostBlock, ProcessedPost, YamlNekoBlock } from "../d.ts";
import { parseRichText, stripRichText } from "../dsl/BlogRichText/blogFormat.ts";
import friendsMessage from "@/data/I18N/friendsMessage.json";
import { socialRawData } from "@/components/ts/global/setupJson.ts";

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
    displayObj[key] = translations?.[currentLang] ?? translations?.en ?? translations?.other ?? "";
  });

  return displayObj;
});
export const socialLinks = computed(() => {
  return socialRawData.value?.socialLinks ?? {};
});

export const nekoImg = shallowRef<YamlNekoBlock[]>([]);
let catLoadingPromise: Promise<void> | null = null;
export const loadCat = async (): Promise<void> => {
  if (nekoImg.value.length > 0) return;
  if (catLoadingPromise) return catLoadingPromise;

  catLoadingPromise = (async () => {
    try {
      const res = await loadSingleYaml<NekoYamlResponse>("main", "neko.yaml");

      if (res && Array.isArray(res.img)) {
        nekoImg.value = res.img.map(
          (img: YamlNekoBlock): YamlNekoBlock => ({
            imgError: img.imgError,
            img: img.img,
            imgName: img.imgName,
          }),
        );
      }
    } finally {
      catLoadingPromise = null;
    }
  })();

  return catLoadingPromise;
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

const descriptionCache = new Map<string, string>();

const getDescriptionCacheKey = (post: Post): string => {
  return `${post.title}__${post.time}`;
};
export const processedPosts = computed<ProcessedPost[]>(() => {
  if (!posts.value) return [];

  return posts.value.map((post) => {
    const blocks = post.blocks ?? [];
    const imageBlocks = blocks.filter((b) => b.type === "image");

    const cacheKey = getDescriptionCacheKey(post);
    let description = descriptionCache.get(cacheKey);

    if (description === undefined) {
      description = getDescriptionText(blocks, 350);
      descriptionCache.set(cacheKey, description);
    }

    return {
      ...post,
      blocks,
      imageBlocks,
      displayDescription: description,
    };
  });
});

export const parsedBlocks = shallowRef<PostBlock[]>([]);

let parsedBlocksJobId = 0;

watch([selectedPost, showModal], async ([newPost, isShow], _, onCleanup) => {
  const jobId = ++parsedBlocksJobId;
  let cancelled = false;

  onCleanup(() => {
    cancelled = true;
  });

  if (!isShow || !newPost?.blocks) {
    return;
  }

  const rawBlocks = newPost.blocks;

  if (import.meta.env.SSR) {
    if (cancelled || jobId !== parsedBlocksJobId || selectedPost.value !== newPost) {
      return;
    }

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
    if (
      cancelled ||
      jobId !== parsedBlocksJobId ||
      !showModal.value ||
      selectedPost.value !== newPost
    ) {
      return;
    }

    temp.push({ ...rawBlocks[i], tokens: [] });

    if ((i + 1) % 10 === 0 || i === rawBlocks.length - 1) {
      parsedBlocks.value = [...temp];
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
});

export const friendsTitle = computed(() => {
  const source = friendsMessage as I18nSource;
  return {
    title: source.title?.[lang.value] ?? source.title?.en ?? "",
  };
});

export const platforms = computed(() => {
  return socialRawData.value?.platforms ?? [];
});
