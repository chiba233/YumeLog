import assert from "node:assert/strict";
import { MAIN_CONTENT_RESOURCES } from "../src/shared/lib/app/mainContentResources.ts";

const assertTempId = (value: unknown): void => {
  assert.equal(typeof value, "string");
  assert.notEqual(value, "");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const assertI18nListShape = (value: unknown): void => {
  assert.ok(Array.isArray(value));
  assert.ok(value.length > 0);

  for (const entry of value) {
    assert.ok(isRecord(entry));
    assert.equal(typeof entry.type, "string");
    assert.equal(typeof entry.content, "string");
    assertTempId(entry.temp_id);
  }
};

export const assertFriendListShape = (value: unknown): void => {
  assert.ok(Array.isArray(value));
  assert.ok(value.length > 0);

  for (const entry of value) {
    assert.ok(isRecord(entry));
    assert.equal(typeof entry.name, "string");
    assert.equal(typeof entry.alias, "string");
    assert.equal(typeof entry.url, "string");
    assert.equal(typeof entry.icon, "string");
    assertTempId(entry.temp_id);
  }
};

export const assertNekoListShape = (value: unknown): void => {
  assert.ok(Array.isArray(value));
  assert.ok(value.length > 0);

  for (const entry of value) {
    assert.ok(isRecord(entry));
    assert.equal(typeof entry.imgError, "string");
    assert.equal(typeof entry.img, "string");
    assert.equal(typeof entry.imgName, "string");
    assertTempId(entry.temp_id);
  }
};

export const assertFromNowShape = (value: unknown): void => {
  assert.ok(Array.isArray(value));
  assert.ok(value.length > 0);

  for (const entry of value) {
    assert.ok(isRecord(entry));
    assert.equal(typeof entry.time, "string");
    assert.equal(typeof entry.photo, "string");
    assertTempId(entry.temp_id);
    assertI18nListShape(entry.names);
  }
};

export const MAIN_RESOURCE_ASSERTIONS = {
  [MAIN_CONTENT_RESOURCES.title.fileName]: (value: unknown) => {
    assert.ok(isRecord(value));
    assert.ok("title" in value);
    assertI18nListShape(value.title);
  },
  [MAIN_CONTENT_RESOURCES.introduction.fileName]: (value: unknown) => {
    assert.ok(isRecord(value));
    assert.ok("introduction" in value);
    assertI18nListShape(value.introduction);
  },
  [MAIN_CONTENT_RESOURCES.friends.fileName]: (value: unknown) => {
    assert.ok(isRecord(value));
    assert.ok("friends" in value);
    assertFriendListShape(value.friends);
  },
  [MAIN_CONTENT_RESOURCES.neko.fileName]: (value: unknown) => {
    assert.ok(isRecord(value));
    assert.ok("img" in value);
    assertNekoListShape(value.img);
  },
  [MAIN_CONTENT_RESOURCES.fromNow.fileName]: (value: unknown) => {
    assert.ok(isRecord(value));
    assert.ok("fromNow" in value);
    assertFromNowShape(value.fromNow);
  },
} as const;

export type MainResourceFileName = keyof typeof MAIN_RESOURCE_ASSERTIONS;

export const isMainResourceFileName = (value: string): value is MainResourceFileName => {
  return value in MAIN_RESOURCE_ASSERTIONS;
};
