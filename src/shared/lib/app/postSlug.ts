import type { Post } from "@/shared/types/blog.ts";

export const getPostSlug = (post?: Pick<Post, "id" | "title"> | null): string | undefined =>
  post?.id ??
  post?.title
    ?.trim()
    .replace(/[\/\\?#]/g, "")
    .replace(/\s+/g, "-");
