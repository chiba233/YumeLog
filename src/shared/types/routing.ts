import type { ComputedRef, Ref } from "vue";

export interface ModalOptions {
  modals: Ref<Record<string, Ref<boolean>>> | Record<string, Ref<boolean>>;
  paramKey: string;
  paramSource?: "query" | "path";
  baseRouteName?: string;
  isReady?: Ref<boolean> | ComputedRef<boolean>;
  loadHandlers?:
    | Ref<Record<string, () => Promise<void> | void>>
    | Record<string, () => Promise<void> | void>;
  onAllClosed?: () => void;
  onInvalidId?: (id: string) => Promise<void> | void;
}
