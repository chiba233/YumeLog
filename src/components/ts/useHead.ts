import { useHead } from "@unhead/vue";
import { computed } from "vue";
import {
  getDescriptionText,
  globalWebTitleMap,
  posts,
  selectedPost,
  showModal,
} from "@/components/ts/useGlobalState.ts";
import { lang } from "@/components/ts/setupLang.ts";
import { getSlug } from "@/components/ts/useRouteModal.ts";
import { ImageContent, PostBlock } from "@/components/ts/d.ts";
import { personRawData } from "@/components/ts/setupJson.ts";
import commonI18n from "@/data/I18N/commonI18n.json";

export const isSSR = import.meta.env.SSR;

export const blogUseHead = () => {
  const titleI18N = commonI18n.blogWelcome as Record<string, string>;
  const siteOrigin = import.meta.env.SSR
    ? import.meta.env.VITE_SSR_SITE_URL
    : window.location.origin;
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
    const firstImg = (getImageBlocks(blocks)?.[0]?.content as ImageContent[])?.[0]?.src ?? "";
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
        const desc = titleI18N[lang.value] || titleI18N.en;

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
