import { useHead } from "@unhead/vue";
import { computed, type ComputedRef, type Ref } from "vue";
import {
  currentPostTitle,
  friends,
  friendsTitle,
  getDescriptionText,
  globalWebTitleMap,
  platforms,
  posts,
  selectedPost,
  showCatModel,
  showLineModel,
  showMaiModal,
  showModal,
  showWechatModel,
  socialLinks,
} from "@/shared/lib/app/useGlobalState.ts";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { getSlug } from "@/shared/lib/app/useRouteModal.ts";
import type { PostBlock } from "@/shared/types/blog.ts";
import { personRawData } from "@/shared/lib/app/setupJson.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import {
  resolveSiteOrigin,
  sanitizeAssetUrl,
  toAbsoluteSiteUrl,
} from "@/shared/lib/app/siteOrigin.ts";

export const isSSR = Boolean(import.meta.env?.SSR);
const siteOrigin = resolveSiteOrigin({
  ssr: isSSR,
  ssrOrigin: import.meta.env?.VITE_SSR_SITE_URL,
  browserOrigin: typeof window !== "undefined" ? window.location.origin : "",
});

// Blog Head
export interface BlogHeadDeps {
  origin?: string;
  ssr?: boolean;
}

// App Head
export interface AppHeadDeps {
  routeName: ComputedRef<string>;
  webTitleData: Record<string, Record<string, string>>;
}

export const createBlogHeadEntries = ({ origin = siteOrigin, ssr = isSSR }: BlogHeadDeps = {}) => {
  const effectiveOrigin = origin || "";
  const blogListUrl = toAbsoluteSiteUrl(effectiveOrigin, "/blog");
  const defaultOgImage = toAbsoluteSiteUrl(effectiveOrigin, "/icon/icon.webp");

  const titleI18N = commonI18n.blogWelcome as Record<string, string>;
  const baseTitle = computed(() => globalWebTitleMap.value?.blog?.[lang.value] ?? "Blog");
  const getImageBlocks = (blocks?: PostBlock[]) => {
    if (!blocks) return [];

    return blocks.filter((b) => b.type === "image");
  };
  const postContext = computed(() => {
    if (
      !showModal.value ||
      !selectedPost.value ||
      (!selectedPost.value.id && !selectedPost.value.title)
    ) {
      return null;
    }
    const post = selectedPost.value;
    const blocks = post.blocks ?? [];
    const slug = getSlug(post);
    const url = slug ? toAbsoluteSiteUrl(effectiveOrigin, `/blog/${slug}`) : "";
    const firstImg = sanitizeAssetUrl(getImageBlocks(blocks)?.[0]?.content?.[0]?.src);
    const desc = getDescriptionText(blocks).slice(0, 160);
    const published = post.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
    return {
      post,
      slug,
      url,
      firstImg,
      desc,
      published,
    };
  });
  return {
    title: computed(() =>
      postContext.value ? `${postContext.value.post.title} - ${baseTitle.value}` : baseTitle.value,
    ),

    link: computed(() => {
      const href = postContext.value ? postContext.value.url : blogListUrl;
      return href ? [{ rel: "canonical", href }] : [];
    }),

    script: computed(() => {
      if (!ssr) return [];
      if (postContext.value) {
        const ctx = postContext.value;
        return [
          {
            type: "application/ld+json",
            innerHTML: JSON.stringify({
              "@context": "https://schema.org",
              ...(ctx.url ? { "@id": ctx.url, url: ctx.url } : {}),
              "@type": "BlogPosting",
              headline: ctx.post.title,
              datePublished: ctx.published,
              ...(ctx.firstImg ? { image: ctx.firstImg } : {}),
              author: {
                "@type": "Person",
                name: personRawData.value?.author[lang.value] ?? personRawData.value?.author?.en,
              },
              publisher: {
                "@type": "Organization",
                name: personRawData.value?.author[lang.value] ?? personRawData.value?.author?.en,
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                ...(ctx.url ? { "@id": ctx.url } : {}),
              },
            }),
          },
        ];
      }

      return [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            blogPost: posts.value.map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              ...(getSlug(post)
                ? { url: toAbsoluteSiteUrl(effectiveOrigin, `/blog/${getSlug(post)}`) }
                : {}),
              datePublished: post.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
              author: {
                "@type": "Person",
                name: personRawData.value?.author[lang.value] ?? personRawData.value?.author?.en,
              },
            })),
          }),
        },
      ];
    }),

    meta: computed(() => {
      if (!postContext.value) {
        const baseDesc = titleI18N[lang.value] || titleI18N.en;
        const formattedPosts =
          posts.value
            ?.map((p) => {
              const date = p.time?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") || "";
              return date && p.title ? `${date} ${p.title}` : p.title || "";
            })
            .filter(Boolean)
            .join(", ") || "";
        const desc = ` ${baseDesc}: ${formattedPosts}`.slice(0, 200);

        return [
          { name: "description", content: desc },

          ...["twitter", "og"].flatMap((p) => [
            {
              [p === "twitter" ? "name" : "property"]: `${p}:title`,
              content: baseTitle.value,
            },
            {
              [p === "twitter" ? "name" : "property"]: `${p}:description`,
              content: desc,
            },
            ...(blogListUrl
              ? [
                  {
                    [p === "twitter" ? "name" : "property"]: `${p}:url`,
                    content: blogListUrl,
                  },
                ]
              : []),
          ]),

          ...(defaultOgImage
            ? [
                {
                  property: "og:image",
                  content: defaultOgImage,
                },
              ]
            : []),

          {
            property: "og:site_name",
            content: globalWebTitleMap.value?.home?.[lang.value],
          },

          { name: "twitter:card", content: "summary" },

          { property: "og:type", content: "website" },
        ];
      }

      const ctx = postContext.value;

      return [
        { name: "description", content: ctx.desc },

        ...["twitter", "og"].flatMap((p) => [
          {
            [p === "twitter" ? "name" : "property"]: `${p}:title`,
            content: ctx.post.title,
          },
          {
            [p === "twitter" ? "name" : "property"]: `${p}:description`,
            content: ctx.desc,
          },
          ...(ctx.firstImg
            ? [
                {
                  [p === "twitter" ? "name" : "property"]: `${p}:image`,
                  content: ctx.firstImg,
                },
              ]
            : []),
          ...(ctx.url
            ? [
                {
                  [p === "twitter" ? "name" : "property"]: `${p}:url`,
                  content: ctx.url,
                },
              ]
            : []),
        ]),

        { name: "twitter:card", content: "summary_large_image" },

        {
          property: "og:site_name",
          content: globalWebTitleMap.value?.home?.[lang.value],
        },

        {
          property: "article:published_time",
          content: ctx.published,
        },

        { property: "og:type", content: "article" },
      ];
    }),
  };
};

export const blogUseHead = () => {
  useHead(createBlogHeadEntries());
};

// App Head
export const createAppHeadEntries = ({ routeName, webTitleData }: AppHeadDeps) => {
  const dynamicTitle = computed(() => {
    const currentLang = lang.value;
    const currentRouteName = routeName.value || "home";
    const baseTitle = globalWebTitleMap.value[currentRouteName]?.[currentLang] || currentRouteName;

    if (currentRouteName === "blog" && currentPostTitle.value) {
      return `${currentPostTitle.value} - ${baseTitle}`;
    }

    const modals = [
      { active: showWechatModel.value, data: webTitleData.weChat },
      { active: showCatModel.value, data: webTitleData.neko },
      { active: showLineModel.value, data: webTitleData.line },
      { active: showMaiModal.value, data: webTitleData.maimai },
    ];

    if (currentRouteName === "home") {
      const active = modals.find((modal) => modal.active);
      if (active) {
        const subTitle = active.data?.[currentLang] || active.data?.en || "";
        return subTitle ? `${subTitle} - ${baseTitle}` : baseTitle;
      }
    }

    return baseTitle;
  });

  return {
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
            globalWebTitleMap.value.home?.[lang.value] || globalWebTitleMap.value.home?.en || "",
        ),
      },
      {
        property: "og:locale",
        content: computed(() => lang.value || "en"),
      },
    ],
  };
};

export const appUseHead = (deps: AppHeadDeps) => {
  useHead(createAppHeadEntries(deps));
};

// Home Head
export const createHomeTitleHeadEntries = (title: Ref<string>) => {
  const homeOgImage = toAbsoluteSiteUrl(siteOrigin, "/icon/icon.webp");
  const homeOgTitle = computed(() => (title.value || "").slice(0, 160));

  return {
    meta: [
      {
        property: "og:title",
        content: homeOgTitle,
      },
      ...(homeOgImage
        ? [
            {
              property: "og:image",
              content: homeOgImage,
            },
          ]
        : []),
    ],
  };
};

export const homeTitleUseHead = (title: Ref<string>) => {
  useHead(createHomeTitleHeadEntries(title));
};

export const createHomeIntroductionHeadEntries = (content: Ref<string>) => {
  const description = computed(() => (content.value || "").slice(0, 160));

  return {
    meta: [
      {
        name: "description",
        content: description,
      },
      {
        property: "og:description",
        content: description,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "twitter:description",
        content: description,
      },
    ],
  };
};

export const homeIntroductionUseHead = (content: Ref<string>) => {
  useHead(createHomeIntroductionHeadEntries(content));
};

// Home Friends Head
export const friendsUseHead = () => {
  const baseOrigin = siteOrigin;
  const toAbsolute = (path: string) => {
    const safePath = sanitizeAssetUrl(path);
    if (!safePath) return "";
    if (/^https?:\/\//.test(safePath)) return safePath;
    const cleanPath = safePath.startsWith("/") ? safePath : `/${safePath}`;
    return `${baseOrigin}${cleanPath}`;
  };
  useHead({
    script: [
      {
        type: "application/ld+json",
        key: "friends-jsonld",
        innerHTML: computed(() => {
          return JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            ...(baseOrigin ? { "@id": `${baseOrigin}#friends-list` } : {}),
            name: friendsTitle.value.title,
            numberOfItems: friends.value?.length || 0,
            itemListElement: (friends.value || []).map((f, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Person",
                name: lang.value === "zh" ? f.name : f.alias,
                image: toAbsolute(f.icon),
                url: f.url,
              },
            })),
          });
        }),
      },
    ],
  });
};
export const headLinks = computed(() => {
  const links = socialLinks.value;
  const social = platforms.value
    .filter((p) => p.type === "link" && links[p.id])
    .map((p) => ({
      rel: "me",
      href: links[p.id],
      title: p.label,
    }));
  return [
    ...social,
    ...(siteOrigin
      ? [
          {
            rel: "canonical",
            href: siteOrigin,
            title: "Home",
          },
        ]
      : []),
  ];
});

export const headMeta = computed(() =>
  siteOrigin
    ? [
        {
          property: "og:url",
          content: siteOrigin,
        },
      ]
    : [],
);

// Home Contact Head
export const createHomeContactHeadEntries = (maimaiRating: ComputedRef<string>) => ({
  link: headLinks,
  meta: computed(() => [
    ...headMeta.value,
    {
      name: "maimai-rating",
      content: maimaiRating.value,
    },
  ]),
});

export const homeContactUseHead = (maimaiRating: ComputedRef<string>) => {
  useHead(createHomeContactHeadEntries(maimaiRating));
};
