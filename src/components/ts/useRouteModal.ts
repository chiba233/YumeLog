import { nextTick, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { $message } from "@/components/ts/msgUtils.ts";
import { ModalOptions, Post } from "@/components/ts/d.ts";

export const useRouteModal = ({
  modals,
  paramKey,
  paramSource = "query",
  baseRouteName,
  isReady,
  loadHandlers,
  onAllClosed,
  onInvalidId,
}: ModalOptions) => {
  if (import.meta.env.SSR) {
    return {
      openModal: async () => {},
      syncModalWithRoute: async () => {},
    };
  }

  const route = useRoute();
  const router = useRouter();

  let isLock = false;

  const getParamId = () => {
    if (paramSource === "path") {
      const raw = route.params[paramKey];
      return (Array.isArray(raw) ? raw[0] : raw) || "";
    }

    const raw = route.query[paramKey];
    return (Array.isArray(raw) ? raw[0] : raw) || "";
  };

  const closeAllModals = () => {
    const current = unref(modals);
    Object.values(current).forEach((m) => {
      m.value = false;
    });
  };

  const clearRouteParam = async () => {
    const nav =
      paramSource === "path"
        ? {
            name: baseRouteName || route.name || "home",
          }
        : {
            name: route.name || "home",
            query: { ...route.query, [paramKey]: undefined },
          };

    await router.replace(nav);
  };

  const syncModalWithRoute = async () => {
    if (isLock) return;

    const modalId = getParamId();
    const currentModals = unref(modals);

    if (!modalId) {
      closeAllModals();
      return;
    }

    if (!(modalId in currentModals)) {
      closeAllModals();

      const ready = unref(isReady) ?? true;
      if (!ready) return;

      if (onInvalidId) {
        isLock = true;
        await onInvalidId(modalId);
        isLock = false;
      } else {
        const i18nSource = commonI18n.invalidAccess as Record<string, string>;
        $message.error(i18nSource[lang.value] || i18nSource["en"], true, 3000);

        isLock = true;
        await clearRouteParam();
        isLock = false;
      }

      return;
    }

    if (currentModals[modalId].value) return;

    closeAllModals();

    const handlers = unref(loadHandlers);

    if (handlers?.[modalId]) {
      try {
        await handlers[modalId]();
      } catch {
        const i18nSource = commonI18n.modalLoadError as Record<string, string>;
        $message.error(i18nSource[lang.value] || i18nSource["en"], true, 3000);
      }
    }

    await nextTick();

    currentModals[modalId].value = true;
  };

  const openModal = async (id: string) => {
    const currentModals = unref(modals);

    if (!(id in currentModals)) {
      if (onInvalidId) {
        void onInvalidId(id);
      } else {
        const i18nSource = commonI18n.unregisteredModalId as Record<string, string>;
        $message.warning(i18nSource[lang.value] || i18nSource["en"], true, 3000);
      }
      return;
    }

    isLock = true;

    try {
      const nav =
        paramSource === "path"
          ? {
              name: route.name || "home",
              params: { ...route.params, [paramKey]: id },
            }
          : {
              name: route.name || "home",
              query: { ...route.query, [paramKey]: id },
            };

      await router.push(nav);

      await nextTick();
    } catch {
      const i18nSource = commonI18n.modalNavigationError as Record<string, string>;
      $message.error(i18nSource[lang.value] || i18nSource["en"], true, 3000);
    } finally {
      isLock = false;
      void syncModalWithRoute();
    }
  };

  watch(
    () => Object.values(unref(modals)).map((m) => m.value),
    async (newStates, oldStates) => {
      if (isLock) return;

      const anyOpen = newStates.some(Boolean);
      const wasOpen = oldStates ? oldStates.some(Boolean) : false;

      if (!anyOpen && wasOpen) {
        isLock = true;

        await clearRouteParam();

        isLock = false;

        onAllClosed?.();
      }
    },
    { deep: true },
  );

  watch(
    () => (paramSource === "path" ? route.params[paramKey] : route.query[paramKey]),
    () => {
      if (!isLock) void syncModalWithRoute();
    },
  );

  if (isReady) {
    watch(
      () => unref(isReady),
      (ready) => {
        if (ready && !isLock) {
          void syncModalWithRoute();
        }
      },
    );
  }

  void nextTick().then(syncModalWithRoute);

  return {
    openModal,
    syncModalWithRoute,
  };
};

export const getSlug = (post?: Post | null) =>
  post?.id ??
  post?.title
    ?.trim()
    .replace(/[\/\\?#]/g, "")
    .replace(/\s+/g, "-");
