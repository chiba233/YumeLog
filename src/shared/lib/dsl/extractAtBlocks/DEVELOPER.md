# DSL: extractAtBlocks 开发者手册

该模块负责将基于 `@` 的结构化 DSL 解析为最终的博客 `Post` 对象。

---

## 1. 核心函数职责 (Function Responsibilities)

### 1.1 `parseDSL.ts` (第一阶段：解析外壳)

- **`parseDirective(line, blockNameSet)`**:
    - **职责**: 识别当前行是否为 `@name` 或 `@end` 指令。
    - **逻辑**: 检查前缀、校验名称合法性、匹配已知块名。
- **`flushFrameText(frame, trimTrailing)`**:
    - **职责**: 将当前 `textBuffer`（暂存的行）转换为一个 `DSLTextChunk` 并存入 `chunks`。
    - **逻辑**: 处理末尾空行修剪，确保文本块的连贯性。
- **`buildNode(frame, depth, lineEnd)`**:
    - **职责**: 将一个解析状态帧（Frame）封装为完整的 `DSLNode`。
    - **逻辑**: 计算 content 字符串，整合 chunks 和 children。
- **`closeFrame(stack, root, lineEnd)`**:
    - **职责**: 处理块闭合时的树形嵌套。
    - **逻辑**: 从栈中弹出当前帧，将其作为子节点添加到父帧或根节点中。
- **`parseDSL(text, options)`**:
    - **职责**: **总调度器**。
    - **逻辑**: 逐行扫描、管理状态栈、处理转义字符、处理未闭合块的报错回退。

### 1.2 `astToPost.ts` (第二阶段：转换语义)

- **`applyMeta(content, target)`**:
    - **职责**: 解析 `@meta` 内容。
    - **逻辑**: 将 `key: value` 行提取并写入目标对象的根部。
- **`appendNode(target, node, options)`**:
    - **职责**: **核心分发器**。
    - **逻辑**: 根据节点的 `AstTransformMode`（如 `metadata` / `block` / `chunked-text`）决定该节点如何转换为最终结果。
- **`createParsedBlock(type, content, options)`**:
    - **职责**: 业务块构造器。
    - **逻辑**: 调用 `blockParsers` 对内容进行深度解析（如图片列表）。
- **`appendChunkedTextNode(target, node, options)`**:
    - **职责**: 针对 `@text` 块的特殊处理。
    - **逻辑**: 保持内部文本段和嵌套块的交替顺序。

### 1.3 `parseDashList.ts` (子解析器)

- **`parseTypedDashObjectList(content, options)`**:
    - **职责**: 解析 `- key: value` 列表。
    - **逻辑**: 处理短横线起始行、键值对分割、引号剥离。
- **`flushMulti()`**:
    - **职责**: 处理 `|` 引导的多行文本块。
    - **逻辑**: 计算并移除基础缩进，还原多行字符串。

---

## 2. 调试打 Log 指南 (Debug & Logging)

当出现特定问题时，请在以下位置插入 `console.log`：

### 2.1 怀疑块识别失败 (如：页面直接显示了 @text)

- **位置**: `parseDSL.ts` -> `parseDSL` 循环内部。
- **Log 内容**: `console.log('Line:', lineIndex, 'Directive:', directive);`
- **目的**: 确认 `parseDirective` 是否正确识别了起始和结束标记。

### 2.2 怀疑嵌套结构乱了 (如：子块跑到了父块外面)

- **位置**: `parseDSL.ts` -> `closeFrame` 底部。
- **Log 内容**: `console.log('Closing:', node.name, 'Stack Depth:', stack.length);`
- **目的**: 观察栈的弹出顺序是否与 DSL 结构匹配。

### 2.3 怀疑 Meta 丢失 (如：标题、日期读取不到)

- **位置**: `astToPost.ts` -> `applyMeta` 循环内。
- **Log 内容**: `console.log('Meta Entry:', { key, value });`
- **目的**: 确认冒号分割逻辑是否正确，是否因为 key 的拼写或空格导致失败。

### 2.4 怀疑图片或列表解析错误

- **位置**: `parseDashList.ts` -> `parseTypedDashObjectList` 循环末尾。
- **Log 内容**: `console.log('Current Item:', current);`
- **目的**: 检查每个 `-` 引导的项目是否被正确识别，属性是否丢失。

### 2.5 怀疑多行字符串 (|) 缩进不对

- **位置**: `parseDashList.ts` -> `flushMulti` 内部。
- **Log 内容**: `console.log('MultiBuffer:', multiBuffer, 'MinIndent:', minIndent);`
- **目的**: 确认缩进计算是否过载，导致文本被过度修剪或没修剪。

---

## 3. 核心坑点与设计决策

- **`@end` 必须独占一行**: 解析器是基于行扫描的。
- **转义符 `\`**: 仅在行首有效（如 `\@text`）。行中的 `@` 不需要转义。
- **文本块合并**: 连续的文字行会被合并为一个 `DSLTextChunk`，以减少 AST 的复杂度。

---

## 4. 扩展指南 (新增块类型流程)

1. **`types.ts`**: 将新名加入 `DSL_BLOCK_NAMES`。
2. **`astToPost.ts`**: 在 `AST_TRANSFORM_MODES` 中定义其模式（通常为 `block`）。
3. **`blockParsers.ts`**: (可选) 如果块内有特殊语法，注册解析器。
4. **`src/shared/types/blog.ts`**: 定义对应的业务 `PostBlock` 类型。

---

## 5. 测试验证

- **指令**: `pnpm run test:dsl`
- **文件**: `tests/blockDsl.golden.test.ts`
- **机制**: 对比解析后的 JSON 与 `.golden` 预设文件。
