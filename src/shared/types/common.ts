export interface CacheEntry<T> {
  data: T;
  lastFetch: number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export type LocaleTextMap = Record<string, string>;

export interface CommonI18nBlock<TContent = string, TType extends string = string> {
  type: TType;
  content?: TContent;
  temp_id: string;
}

export interface BaseBlock<TType extends string, TContent = undefined> {
  type: TType;
  content?: TContent;
}

export interface BaseMetadata {
  time: string;
  pin?: string;
}
