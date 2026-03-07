import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/useStorage";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/blog/:id?",
      name: "blog",
      component: () => import("../views/BlogView.vue"),
      props: true,
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: HomeView,
      beforeEnter: async (to, from, next) => {
        const { $message } = await import("@/components/ts/msgUtils");
        const i18nSource = commonI18n.invalidAccess as Record<string, string>;
        const warningMsg = i18nSource[lang.value] || i18nSource["en"];
        $message.warning(warningMsg, true, 4000);
        if (from.name) {
          next(false);
        } else {
          next({ name: "home" });
        }
      },
    },
  ],
});

export default router;
