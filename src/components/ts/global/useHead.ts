import { useHead } from "@unhead/vue";
import { computed } from "vue";
import {
  friends,
  friendsTitle,
  getDescriptionText,
  globalWebTitleMap,
  platforms,
  posts,
  selectedPost,
  showModal,
  socialLinks,
} from "@/components/ts/global/useGlobalState.ts";
import { lang } from "@/components/ts/global/setupLang.ts";
import { getSlug } from "@/components/ts/global/useRouteModal.ts";
import { PostBlock } from "@/components/ts/d.ts";
import { personRawData } from "@/components/ts/global/setupJson.ts";
import commonI18n from "@/data/I18N/commonI18n.json";

export const isSSR = import.meta.env.SSR;
const siteOrigin = import.meta.env.SSR ? import.meta.env.VITE_SSR_SITE_URL : window.location.origin;

export const blogUseHead = () => {
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
    const url = `${siteOrigin}/blog/${slug}`;
    const firstImg = getImageBlocks(blocks)?.[0]?.content?.[0]?.src ?? "";
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
  useHead({
    title: computed(() =>
      postContext.value ? `${postContext.value.post.title} - ${baseTitle.value}` : baseTitle.value,
    ),

    link: computed(() => [
      {
        rel: "canonical",
        href: postContext.value ? postContext.value.url : `${siteOrigin}/blog`,
      },
    ]),

    script: computed(() => {
      if (!isSSR) return [];
      if (postContext.value) {
        const ctx = postContext.value;
        return [
          {
            type: "application/ld+json",
            innerHTML: JSON.stringify({
              "@context": "https://schema.org",
              "@id": ctx.url,
              url: ctx.url,
              "@type": "BlogPosting",
              headline: ctx.post.title,
              datePublished: ctx.published,
              image: ctx.firstImg,
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
                "@id": ctx.url,
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
              url: `${siteOrigin}/blog/${getSlug(post)}`,
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
            {
              [p === "twitter" ? "name" : "property"]: `${p}:url`,
              content: `${siteOrigin}/blog`,
            },
          ]),

          {
            property: "og:image",
            content: `${siteOrigin}/icon/icon.webp`,
          },

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
          {
            [p === "twitter" ? "name" : "property"]: `${p}:image`,
            content: ctx.firstImg,
          },
          {
            [p === "twitter" ? "name" : "property"]: `${p}:url`,
            content: ctx.url,
          },
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
  });
};
export const friendsUseHead = () => {
  const getAutoHostname = () => {
    if (import.meta.env.SSR) {
      if (import.meta.env.VITE_SITE_URL) {
        return import.meta.env.VITE_SITE_URL.replace(/\/+$/, "");
      }
      return "localhost:14514";
    }
    return window.location.origin;
  };
  const baseOrigin = getAutoHostname();
  const toAbsolute = (path: string) => {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
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
            "@id": `${baseOrigin}#friends-list`,
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
    {
      rel: "canonical",
      href: `${siteOrigin}`,
      title: "Home",
    },
    {
      property: "og:url",
      content: siteOrigin,
    },
  ];
});
