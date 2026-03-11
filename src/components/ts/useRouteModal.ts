import { ComputedRef, nextTick, Ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { $message } from "@/components/ts/msgUtils.ts";

const globalModalRegistry = new Set<string>();
let isReportingError = false;

interface ModalOptions {
  modals: Ref<Record<string, Ref<boolean>>> | Record<string, Ref<boolean>>;
  paramKey: string;

  // 新增
  paramSource?: "query" | "path";

  isReady?: Ref<boolean> | ComputedRef<boolean>;

  loadHandlers?:
    | Ref<Record<string, () => Promise<void> | void>>
    | Record<string, () => Promise<void> | void>;

  onAllClosed?: () => void;
  onInvalidId?: (id: string) => Promise<void> | void;
}

export function useRouteModal({
  modals,
  paramKey,
  paramSource = "query",
  isReady,
  loadHandlers,
  onAllClosed,
  onInvalidId,
}: ModalOptions) {
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

  watch(
    () => unref(modals),
    (newModals) => {
      Object.keys(newModals).forEach((key) => globalModalRegistry.add(key));
    },
    { immediate: true, deep: true },
  );

  const syncModalWithRoute = async () => {
    if (isLock) return;

    const modalId = getParamId();
    const currentModals = unref(modals);

    if (!modalId) {
      Object.values(currentModals).forEach((m) => {
        m.value = false;
      });
      return;
    }

    if (!(modalId in currentModals)) {
      Object.values(currentModals).forEach((m) => {
        m.value = false;
      });

      const ready = unref(isReady) ?? true;

      if (ready && !isReportingError) {
        if (onInvalidId) {
          isLock = true;
          await onInvalidId(modalId);
          isLock = false;
        } else if (!globalModalRegistry.has(modalId)) {
          isReportingError = true;

          const i18nSource = commonI18n.invalidAccess as Record<string, string>;
          $message.error(i18nSource[lang.value] || i18nSource["en"], true, 3000);

          isLock = true;

          const nav =
            paramSource === "path"
              ? {
                  name: route.name || "home",
                  params: { ...route.params, [paramKey]: undefined },
                }
              : {
                  name: route.name || "home",
                  query: { ...route.query, [paramKey]: undefined },
                };

          void router.replace(nav).finally(() => {
            setTimeout(() => {
              isLock = false;
              isReportingError = false;
            }, 200);
          });
        }
      }
      return;
    }

    if (currentModals[modalId].value) return;

    Object.values(currentModals).forEach((m) => {
      m.value = false;
    });

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
      setTimeout(() => {
        isLock = false;
        void syncModalWithRoute();
      }, 50);
    }
  };

  watch(
    () => Object.values(unref(modals)).map((m) => m.value),
    (newStates, oldStates) => {
      if (isLock) return;

      const anyOpen = newStates.some((s) => s);
      const wasAnyOpen = oldStates ? oldStates.some((s) => s) : false;

      const currentId = getParamId();

      if (!anyOpen && wasAnyOpen && currentId in unref(modals)) {
        isLock = true;

        const nav =
          paramSource === "path"
            ? {
                name: route.name || "home",
                params: { ...route.params, [paramKey]: undefined },
              }
            : {
                name: route.name || "home",
                query: { ...route.query, [paramKey]: undefined },
              };

        router
          .push(nav)
          .catch(() => {})
          .finally(() => {
            isLock = false;
          });

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

  void nextTick().then(() => {
    void syncModalWithRoute();
  });

  return { openModal, syncModalWithRoute };
}
