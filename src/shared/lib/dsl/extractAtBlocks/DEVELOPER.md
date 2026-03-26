# DSL: extractAtBlocks 开发者手册

该模块负责将基于 `@` 的结构化 DSL 解析为最终的博客 `Post` 对象。

---

## 1. 架构概览

```
原始 DSL 文本
    │
    ▼
parseDSL.ts          第一阶段：行扫描 → AST (DSLTree)
    │
    ▼
astToPost.ts         第二阶段：AST → Post 对象
    │  查询
    ▼
blockHandlers.ts     块行为注册表 (handler registry)
    │  调用
    ▼
parseDashList.ts     子解析器：dash-list / 多行字面量
```

所有 block 类型的行为定义集中在 `blockHandlers.ts` 一处：

```typescript
export const BLOCK_HANDLERS: Record<DSLBlockName, BlockHandler> = {
  meta: { transform: "metadata" },
  text: { nestable: true, transform: "chunked-text", buildBlock: createStringBlock("text") },
  image: { transform: "block", buildBlock: (content, tempId, onError) => ({ ... }) },
  divider: { transform: "block", buildBlock: createStringBlock("divider") },
};
```

---

## 2. 核心文件职责

### 2.1 `blockHandlers.ts` — 块行为注册表 (单一数据源)

每个 block 在此声明三项属性：

| 属性            | 类型                                         | 说明                  |
|---------------|--------------------------------------------|---------------------|
| `transform`   | `"metadata" \| "block" \| "chunked-text"`  | AST 节点如何映射到最终 Post  |
| `nestable?`   | `boolean`                                  | 是否允许子块嵌套            |
| `buildBlock?` | `(content, tempId, onError?) => PostBlock` | 内容解析 + PostBlock 构建 |

派生值自动从注册表计算，无需手动同步：

- `NESTABLE_BLOCK_NAMES` — 从 `handler.nestable === true` 的 key 中收集
- `createFallbackTextBlock` — 未知块的降级处理

### 2.2 `parseDSL.ts` — 第一阶段：解析外壳

- `parseDirective(line, blockNameSet)` — 识别 `@name` / `@end` 指令
- `processLine(...)` — 管理状态栈、处理转义、嵌套校验
- `parseDSL(text, options)` — 总调度器，逐行扫描产出 `DSLTree`

### 2.3 `astToPost.ts` — 第二阶段：转换语义

- `appendNode(target, node, options)` — 核心分发器，查询 `BLOCK_HANDLERS[name].transform` 决定行为
- `buildBlock(node, onError)` — 调用 handler 的 `buildBlock` 构建 PostBlock
- `applyMeta(content, target)` — 解析 `@meta` 的 `key: value` 行写入 Post 根部

### 2.4 `parseDashList.ts` — 子解析器

- `analyzeDashListLine(line)` — 结构化分析单行（indent / marker / key / value / multiline）
- `parseTypedDashObjectList(content)` — 消费 `analyzeDashListLine` 解析完整列表

缩进规则：

```
- name: test          ← 新 item，markerWidth = 2（"- " 的长度）
  value: 456          ← 续行，indent 必须 === markerWidth (2)
  body: |             ← 多行指示符
    line1             ← 多行内容，indent >= markerWidth + 2 (4)
    line2
  next: done          ← 回到续行层级 (2)
```

- marker 宽度动态检测：`-key: val`（宽度 1）和 `- key: val`（宽度 2）均合法
- 续行缩进严格锁定：必须等于首行 marker 宽度
- 多行内容缩进：`markerWidth + 2`，剥离时固定按此宽度裁切

---

## 3. 新增块类型流程

### 3.1 添加简单块（string 内容）

以新增 `@quote` 块为例：

**第 1 步** — `types.ts`：注册块名

```typescript
export const DSL_BLOCK_NAMES = ["image", "meta", "divider", "text", "quote"] as const;
```

**第 2 步** — `blockHandlers.ts`：声明 handler

```typescript
export const BLOCK_HANDLERS: Record<DSLBlockName, BlockHandler> = {
  // ... 现有 handlers
  quote: {
    transform: "block",
    buildBlock: createStringBlock("quote"),
  },
};
```

**第 3 步** — `src/shared/types/blog.ts`：添加 PostBlock 类型

```typescript
export interface QuotePostBlock extends BaseBlock<"quote", string> {
  content: string;
  temp_id: string;
}

export type PostBlock = TextPostBlock | ImagePostBlock | DividerPostBlock | QuotePostBlock;
```

完成。`astToPost.ts` 和 `parseDSL.ts` 不需要改动。

### 3.2 添加带自定义解析器的块

以新增 `@gallery` 块（内容为 dash-list 图片列表）为例：

```typescript
// blockHandlers.ts
import type { GalleryItem } from "../../../types/blog.ts";

export const BLOCK_HANDLERS: Record<DSLBlockName, BlockHandler> = {
  // ... 现有 handlers
  gallery: {
    transform: "block",
    buildBlock: (content, tempId, onError) => ({
      type: "gallery",
      content: parseTypedDashObjectList<GalleryItem>(content, { onError }),
      temp_id: tempId,
    }),
  },
};
```

### 3.3 添加可嵌套的块

以新增 `@section` 块为例（允许子块，行为类似 `@text`）：

```typescript
// blockHandlers.ts
export const BLOCK_HANDLERS: Record<DSLBlockName, BlockHandler> = {
  // ... 现有 handlers
  section: {
    nestable: true,                            // ← 允许子块
    transform: "chunked-text",                 // ← 文本+子块交替
    buildBlock: createStringBlock("section"),
  },
};
```

设置 `nestable: true` 后，`NESTABLE_BLOCK_NAMES` 会自动包含 `"section"`，无需手动同步。

DSL 输入示例：

```
@section
这是外层文字
@divider
@end
这是分隔符后的文字
@end
```

产出结构：

```json
{
  "blocks": [
    {
      "type": "section",
      "content": "这是外层文字"
    },
    {
      "type": "divider",
      "content": ""
    },
    {
      "type": "section",
      "content": "这是分隔符后的文字"
    }
  ]
}
```

---

## 4. Dash-List 数据结构

`parseTypedDashObjectList<T>` 将 dash-list 文本解析为 `T[]`。

### 输入

```
- src: /a.webp
  desc: "风景照"
- src: /b.webp
  desc: wow
  body: |
    多行内容第一行
    多行内容第二行
```

### 产出

```json
[
  {
    "temp_id": "...",
    "src": "/a.webp",
    "desc": "风景照"
  },
  {
    "temp_id": "...",
    "src": "/b.webp",
    "desc": "wow",
    "body": "多行内容第一行\n多行内容第二行"
  }
]
```

### 缩进违规示例

```
- test: 123
 x: 1              ← dslFormatError（indent 1 ≠ markerWidth 2）
   y: 2            ← dslFormatError（indent 3 ≠ 2）
  z: 3             ← OK（indent 2 === 2）
```

---

## 5. 调试指南

| 症状             | 打 Log 位置                           | 内容                                       |
|----------------|------------------------------------|------------------------------------------|
| 页面直接显示 `@text` | `parseDSL.ts` → `processLine`      | `directive` 值，确认指令是否被识别                  |
| 子块跑到父块外面       | `parseDSL.ts` → `closeFrame`       | `node.name` + `stack.length`，确认弹栈顺序      |
| Meta 标题/日期读不到  | `astToPost.ts` → `applyMeta`       | `{ key, value }`，确认冒号分割                  |
| 图片列表解析错误       | `parseDashList.ts` → `analysis` 变量 | `analyzeDashListLine(raw)` 的返回值          |
| 多行字符串被截断       | `parseDashList.ts` → `flushMulti`  | `multiBuffer` + `itemMarkerWidth`，确认剥离宽度 |

---

## 6. 核心约束

- `@end` 必须独占一行（解析器基于行扫描）
- 转义符 `\` 仅在行首有效（如 `\@text`），行中的 `@` 不需要转义
- 连续文字行会合并为单个 `DSLTextChunk`
- dash-list 续行缩进必须严格等于 marker 宽度，不是"有空格就收"

---

## 7. 测试验证

- 命令: `pnpm run test:dsl`
- 文件: `tests/blockDsl.golden.test.ts`
- Fixture: `tests/fixtures/blockDsl.*.json`
