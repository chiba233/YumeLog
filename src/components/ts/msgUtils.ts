import type { MessageApiInjection } from "naive-ui/es/message/src/MessageProvider";

let message: MessageApiInjection | null = null;

export const setGlobalMessage = (instance: MessageApiInjection) => {
  message = instance;
};

export const $message = {
  info: (content: string, closable: boolean, duration: number) => message?.info(content, { closable, duration }),
  success: (content: string, closable: boolean, duration: number) => message?.success(content, { closable, duration }),
  error: (content: string, closable: boolean, duration: number) => message?.error(content, { closable, duration }),
  warning: (content: string, closable: boolean, duration: number) => message?.warning(content, { closable, duration }),
  loading: (content: string, closable: boolean, duration: number) => message?.loading(content, { closable, duration }),
};