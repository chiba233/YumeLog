import type { RouteRecordRaw } from "vue-router";
import { createMemoryHistory, createRouter, createWebHistory } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
  },
  {
    path: "/blog/:id?",
    name: "blog",
    component: () => import("../views/BlogView.vue"),
    props: true,
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: () => ({
      name: "home",
      query: { invalid: "1" },
    }),
  },
];

const router = createRouter({
  history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
  routes,
});

export default router;
