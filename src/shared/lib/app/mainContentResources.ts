export const MAIN_CONTENT_RESOURCES = {
  friends: {
    fileName: "friends.dsl",
    type: "main",
  },
  fromNow: {
    fileName: "fromNow.dsl",
    type: "main",
  },
  introduction: {
    fileName: "introduction.dsl",
    keyName: "introduction",
    type: "main",
  },
  neko: {
    fileName: "neko.dsl",
    type: "main",
  },
  title: {
    fileName: "title.dsl",
    keyName: "title",
    type: "main",
  },
} as const;

export type MainContentResourceKey = keyof typeof MAIN_CONTENT_RESOURCES;
