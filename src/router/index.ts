import type { RouteRecordRaw } from "vue-router";
import { createMemoryHistory, createRouter, createWebHistory } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
    props: true,
  },
  {
    path: "/blog/:id?",
    name: "blog",
    component: () => import("../views/BlogView.vue"),
    props: true,
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: {
      path: "/",
      query: { invalid: "1" },
    },
  },
];

export const createAppRouter = (
  isSSR = Boolean(import.meta.env?.SSR || typeof window === "undefined"),
) =>
  createRouter({
    history: isSSR ? createMemoryHistory() : createWebHistory(),
    routes,
  });

const router = createAppRouter();

export default router;
