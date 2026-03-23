# BlogRichText 代码维护说明

这份 README 不是 DSL 使用教程，而是给维护 `src/shared/lib/dsl/BlogRichText` 目录的人看的。

如果你要改解析器，先看这里。

---

## 1. 这个目录在做什么

这个目录负责把博客正文里的 Rich Text DSL 解析成 `TextToken[]`。

当前设计目标：

- 合法语法正常产出 token
- 非法语法尽量 fallback 成可读文本
- 尽量恢复后文，不让一处坏输入拖死整段
- 错误提示要贴近真实语义，而不是一律报“没闭合”

---

## 2. 整体流程与数据流 (Data Flow)

主入口在 [blogFormat.ts](/src/shared/lib/dsl/BlogRichText/blogFormat.ts)。

### 解析流程图

```text
字符串 (text)
  ↓
[ 主循环 (blogFormat.ts) ]
  ├─ 识别层 (scanner.ts/escape.ts): 识别 $$tag(、)$$、\ 等边界
  ├─ 推进层 (consumers.ts/complex.ts): 处理入栈(Open)、弹栈(Close)、深度限制
  └─ 缓冲层 (context.ts): 收集普通文字到 buffer
      ↓
[ 语义处理 (handlers.ts) ]
  ├─ 分参 (builders.ts): 将内容按 | 切分
  └─ 映射: 将 tag 名映射到业务逻辑 (如 link -> 链接)
      ↓
[ 构造层 (createToken.ts) ]
  └─ 补全: 为每个节点分配 temp_id (用于 Vue 渲染 key)
      ↓
结果 (TextToken[])
```

---

## 3. 开发者 CheckList (新增 Tag 流程)

如果你要新增一个功能标签（例如 `$$video(url)$$`）：

1. **定义类型**: 在 `types.ts` 中找到 `TextToken` 相关联合类型，添加 `VideoToken` 及其属性定义。
2. **实现 Handler**: 在 `handlers.ts` 中编写该 tag 的处理逻辑。如果是简单的标题类，可复用 `createTitledTagHandler`。
3. **注册 Tag**: 在 `handlers.ts` 的 `TAG_HANDLERS` 常量中建立映射。
4. **定义语法常量** (可选): 如果涉及特殊的 block 标记，在 `constants.ts` 中定义。
5. **编写测试**:

- 在 `tests/blockDsl.golden.test.ts` 或相关文件中添加测试用例。
- 运行 `pnpm run test:dsl` 验证输出。

6. **前端渲染**: 在 `RichTextRenderer.vue` 或对应组件中增加对新 token 类型的渲染逻辑。

---

## 4. 文件说明 (按职责划分)

### [types.ts](/src/shared/lib/dsl/BlogRichText/types.ts)

作用：

- 放所有核心类型

关键内容：

- `TextToken`
    - 运行时最终 token 结构
    - 一定带 `temp_id`

- `TokenDraft`
    - `Omit<TextToken, "temp_id">`
    - 给 handler / builder 用的中间结果

- `ParseContext`
    - 解析时的现场
    - 包含 `text`、`root`、`stack`、`buffer`、`i`

- `ParseStackNode`
    - inline 嵌套时压栈的节点

- `TagHandler`
    - tag 的业务解释接口
    - 当前约定是返回 `TokenDraft`

维护原则：

- 如果只是给 token 加业务字段，先看这里
- 不要让 `TagHandler` 再返回带 `temp_id` 的最终 token

### [constants.ts](/src/shared/lib/dsl/BlogRichText/constants.ts)

作用：

- 放 DSL 的语法常量

关键常量：

- `TAG_PREFIX = "$$"`
- `TAG_OPEN = "("`
- `TAG_CLOSE = ")"`
- `TAG_DIVIDER = "|"`
- `END_TAG = ")$$"`
- `RAW_OPEN = ")%"`
- `BLOCK_OPEN = ")*"`
- `RAW_CLOSE = "%end$$"`
- `BLOCK_CLOSE = "*end$$"`
- `ESCAPE_CHAR = "\\"`

维护原则：

- 这里只放“是什么”
- 不放任何带流程判断的逻辑

### [chars.ts](/src/shared/lib/dsl/BlogRichText/chars.ts)

作用：

- 放一些非常底层的字符 / 行判断工具

关键函数：

- `isTagStartChar(c)`
    - tag 名首字符是否合法

- `isTagChar(c)`
    - tag 名中间字符是否合法

- `getLineEnd(text, pos)`
    - 找当前行尾，兼容 CRLF

- `isLineStart(text, pos)`
    - 判断某位置是不是行首

- `isWholeLineToken(text, pos, token)`
    - 判断某 token 是否独占整行
    - raw / block close 判断依赖它

### [escape.ts](/src/shared/lib/dsl/BlogRichText/escape.ts)

作用：

- 统一管理转义读取和还原

关键函数：

- `readEscapedSequence(text, i)`
    - 如果 `text[i]` 是合法转义开头，就返回“被转义的内容”和下一个 index
    - 支持普通字符，也支持 `%end$$` / `*end$$`

- `readEscaped(text, i)`
    - 更宽松的读取器
    - 有转义就吃转义，没有就按普通字符返回

- `unescapeInline(str)`
    - 把最终文本里的转义还原成字面字符

维护原则：

- 这里负责“如何识别转义”
- 不负责“什么时候该解”

### [scanner.ts](/src/shared/lib/dsl/BlogRichText/scanner.ts)

作用：

- 只负责扫描，不负责业务 token

关键函数：

- `findTagArgClose(text, start)`
    - 找 tag 参数区的右括号
    - 会处理嵌套括号和转义

- `readTagStartInfo(text, i)`
    - 从当前位置读一个 tag 起点
    - 成功时返回 tag 名、起始位置、inline 内容起点

- `getTagCloserType(text, tagOpenIndex)`
    - 判断这个 tag 是 inline / raw / block 哪种闭合方式

- `findInlineClose(text, start)`
    - 找 inline 的 `)$$`

- `findBlockClose(text, start)`
    - 找 block 的 `*end$$`
    - 会处理嵌套 block / raw / inline

- `findRawClose(text, start)`
    - 找 raw 的 `%end$$`

- `findMalformedWholeLineTokenCandidate(text, start, token)`
    - 找“看起来像 close，但格式不合法”的候选行
    - 用来区分 `not closed` 和 `malformed close`

- `skipDegradedInline(text, start)`
    - depth limit 或降级场景下，跳过整段 degraded inline

维护原则：

- 这里不该产出 token
- 这里只回答“输入里有没有这个边界”

### [context.ts](/src/shared/lib/dsl/BlogRichText/context.ts)

作用：

- 管解析现场和文本缓冲

关键函数：

- `getCurrentTokens(ctx)`
    - 返回当前应该往哪一层 token 数组里写东西
    - 如果栈为空，就是 `root`
    - 否则就是栈顶节点的 `tokens`

- `pushTextToCurrent(ctx, str)`
    - 往当前层塞普通文本
    - 会自动和上一个 text token 合并，避免碎片化

- `flushBuffer(ctx)`
    - 把 `ctx.buffer` 落进当前 token 数组

- `finalizeUnclosedTags(ctx)`
    - EOF 时处理仍未闭合的 inline 标签
    - 会报 `richTextInlineNotClosed`
    - 会把原始 opening 片段和已产出的内部内容拼回去

维护原则：

- 这里只管上下文推进和收口
- 不要把 tag 语义写进这里

### [createToken.ts](/src/shared/lib/dsl/BlogRichText/createToken.ts)

作用：

- 统一生成带 `temp_id` 的最终 token

关键函数：

- `createToken(tokenDraft)`
    - 给 draft 补 `temp_id`

当前约定：

- handler / builder 产出 `TokenDraft`
- 最终由外层统一 `createToken(...)`

### [builders.ts](/src/shared/lib/dsl/BlogRichText/builders.ts)

作用：

- 放纯构造和参数整理 helper

关键函数：

- `extractText(tokens)`
    - 把 token 树拍平成纯文本

- `materializeTextTokens(tokens)`
    - 把已经不再承担语法意义的 token 树还原成最终展示文本
    - 这是“最终落地”动作，不是通用补丁

- `splitTokensByPipe(tokens)`
    - 只按未转义的 `|` 分参
    - `\|` 不参与分参

- `parsePipeArgs(tokens)`
    - 给 pipe 参数提供统一访问视图
    - `text(index)`：取第 N 个参数的文本值
    - `materializedTokens(index)`：取第 N 个参数对应的 token
    - `materializedTailTokens(startIndex)`：把后半段参数合并成 token

- `parsePipeTextArgs(text)`
    - raw arg 是字符串时的快捷入口

- `buildRichBlock(type, titleToken, content, defaultTitleI18nKey)`
    - 构造标题类 block / inline 的 draft

- `buildPlainRawBlock(...)`
    - raw 形态标题块的构造器

- `buildLabeledInlineBlock(...)`
    - `info` / `warning` / `collapse` 的 inline 构造器

- `normalizeLang(codeLang)`
    - 归一化代码语言
    - 遇到不支持语言会弹提示并回退为 `text`

维护原则：

- 这里可以写“参数怎么整理”
- 但不要写“解析主流程怎么推进”

### [handlers.ts](/src/shared/lib/dsl/BlogRichText/handlers.ts)

作用：

- 放每个 Rich tag 的业务语义

关键内容：

- `createTitledTagHandler(...)`
    - 给 `info` / `warning` / `collapse` 复用逻辑

- `TAG_HANDLERS`
    - 每个 tag 的 `inline` / `raw` / `block` 解释器

- `isRichType(tag)`
    - 判断 tag 是否属于已知 RichType

- `BLOCK_TYPES_SET`
    - 给 block 相关逻辑复用

当前约定：

- `TAG_HANDLERS` 只返回 `TokenDraft`
- 不在这里发 `temp_id`
- 不在这里推进解析上下文

维护原则：

- 如果你想改“一个 tag 最后长什么样”，改这里
- 如果你想改“怎么扫描 / 怎么恢复 / 怎么报错”，不要改这里

### [consumers.ts](/src/shared/lib/dsl/BlogRichText/consumers.ts)

作用：

- 主循环里的消费动作实现

关键函数：

- `tryConsumeTagStart(ctx, parseInlineContent)`
    - 从当前位置尝试开始一个 tag
    - 会依次走：
        - `tryConsumeDepthLimitedTag`
        - `tryConsumeComplexTag`
        - `tryConsumeInlineTag`

- `tryConsumeDepthLimitedTag(...)`
    - 超过深度限制时不再递归解析
    - 尽量把这一整段按文本降级保留下来

- `tryConsumeComplexTag(...)`
    - 把 raw / block 语法交给 `complex.ts`

- `tryConsumeInlineTag(...)`
    - inline 正常起点入栈

- `tryConsumeTagClose(ctx)`
    - 处理 `)$$`
    - 如果栈为空，就是 `unexpected close`
    - 否则弹栈并交给 `finalizeClosedNode`

- `finalizeClosedNode(ctx, node)`
    - inline 节点闭合时的统一收口
    - 已知 richType：走 handler
    - 未知 richType：去壳并保留内部内容
    - 没有 inline handler 的已知 richType：走默认 token 构造

- `tryConsumeEscape(ctx)`
    - 处理转义输入
    - 在 tag 内部会先保留原始转义片段，避免过早 materialize

维护原则：

- 这里最容易把“流程”和“语义”写混
- 记住：这里只管“什么时候推进、什么时候收口”

### [complex.ts](/src/shared/lib/dsl/BlogRichText/complex.ts)

作用：

- 专门处理 raw / block 形态

关键函数：

- `tryParseComplexTag(...)`
    - 识别 raw / block
    - 找 close
    - 判断 malformed close
    - 调用对应 handler
    - 统一返回 `ComplexTagParseResult`

这里处理的几种结果：

- `handled: false`
    - 说明不是 complex tag，外层继续按 inline 逻辑看

- `fallbackText`
    - 说明这里降级成普通文本

- `token`
    - 说明 complex tag 成功产出 token

- `error`
    - 说明这里需要上报 `not closed` 或 `malformed close`

维护原则：

- block / raw 的关闭语义优先看这里
- `malformed close` 的区分也在这里和 `scanner.ts`

### [blockTagFormatting.ts](/src/shared/lib/dsl/BlogRichText/blockTagFormatting.ts)

作用：

- 管 block tag 的前后换行细节

关键函数：

- `isBlockTag(tag)`
    - 判断 tag 是否属于 block 类型

- `stripSingleLeadingLineBreak(text)`
    - block 内容开始处去掉一个前导换行

- `consumeSingleTrailingLineBreak(text, index)`
    - block close 后吞掉一个尾随换行

- `normalizeBlockTagContent(tag, content)`
    - block 内容归一化入口

- `consumeBlockTagTrailingLineBreak(tag, text, index)`
    - block close 后索引推进归一化入口

这个文件的职责比较窄：

- 只管换行细节
- 不管 token 语义

### [errors.ts](/src/shared/lib/dsl/BlogRichText/errors.ts)

作用：

- 负责错误文案、上下文、批量合并、节流

关键函数：

- `getErrorContext(text, index, length, range)`
    - 生成 `(line, column, snippet)` 上下文

- `emitI18nError(key, replacements, silent, text?, index?, length?)`
    - 真正发错误
    - 如果当前在 batch 里，就先入队
    - 否则直接按类型节流后弹 message

- `beginRichTextErrorBatch(silent)`
    - 开始一个 parse 批次

- `endRichTextErrorBatch(silent)`
    - 结束批次并 flush message

- `withRichTextErrorBatch(silent, run)`
    - batch 生命周期包装器

内部机制：

- 同一 `parseRichText` 批次内多个错误会合并成一个 message
- 同一错误类型 5 秒内重复触发会静默

维护原则：

- 错误合并和静默改这里
- 不要把错误生命周期直接塞回 `parseRichText` 主体

### [blogFormat.ts](/src/shared/lib/dsl/BlogRichText/blogFormat.ts)

作用：

- 解析入口
- 最终给外部调用

关键函数：

- `parseRichText(text, depthLimit, silent)`
    - 富文本解析主入口
    - 由 `withRichTextErrorBatch` 包住一次解析生命周期

- `stripRichText(text)`
    - 调 `parseRichText(..., true)` 后再 `extractText`

维护原则：

- 这里应该尽量薄
- 不要往这里塞 tag 业务细节

### [blockTokenCache.ts](/src/shared/lib/dsl/BlogRichText/blockTokenCache.ts)

作用：

- 给 block 级 token 做简单缓存

关键函数：

- `getCachedBlockTokens(blockTempId)`
- `setCachedBlockTokens(blockTempId, tokens)`
- `clearCachedBlockTokens()`

这个文件和解析语义关系不大，主要是性能辅助层。

---

## 4. 现在最容易写炸的几个点

### 4.1 太早 unescape / materialize

如果你把 `\|` 太早还原成 `|`：

- 后面的 pipe 分参会错

如果你把 `\)` 太早还原成 `)`：

- 后面的 close 边界判断会错

所以记住：

- 识别语法边界时，尽量保留原始转义
- 只有在“最终落地文本”时才 materialize

### 4.2 把流程逻辑和 tag 语义写混

常见错误：

- 在 `handlers.ts` 里处理 parse stack
- 在 `consumers.ts` 里硬编码某个 tag 的业务

边界应该是：

- `consumers.ts`：流程推进
- `handlers.ts`：业务语义

### 4.3 把所有关闭失败都报成 not closed

当前系统特意区分：

- `not closed`
- `malformed close`

因为这两类错误给作者的修复方向完全不同。

如果以后改 close 逻辑，不要把它们重新合并掉。

---

## 5. 修改时的建议顺序

如果你遇到问题，按这个顺序定位：

1. 这是扫描问题吗？
    - 看 `scanner.ts` / `chars.ts` / `escape.ts`

2. 这是主循环推进问题吗？
    - 看 `consumers.ts` / `context.ts`

3. 这是 raw / block 边界问题吗？
    - 看 `complex.ts` / `blockTagFormatting.ts`

4. 这是某个 tag 的业务语义问题吗？
    - 看 `handlers.ts` / `builders.ts`

5. 这是报错体验问题吗？
    - 看 `errors.ts`

6. 这是 token id / 输出结构问题吗？
    - 看 `types.ts` / `createToken.ts`

---

## 6. Debug 时先去哪里打 log

下面这部分是实战里最有用的。

### 6.1 怀疑“起点没识别出来”

现象：

- 明明写了 `$$bold(...)$$`
- 结果完全按普通文本吐回去

优先打 log 的地方：

- [scanner.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/scanner.ts) 的 `readTagStartInfo`
- [consumers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/consumers.ts) 的 `tryConsumeTagStart`

建议看这些值：

- 当前 `ctx.i`
- `readTagStartInfo(...)` 返回值
- `tag`
- `inlineContentStart`

这类问题通常说明：

- tag 名不合法
- `$$` 后面字符不符合 tag 起始规则
- 参数区开头没被识别成 `(`

### 6.2 怀疑“闭合边界找错了”

现象：

- 明明闭合了，却报 `not closed`
- 或者本来应该降级，结果被吞得很奇怪

优先打 log 的地方：

- [scanner.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/scanner.ts) 的 `findInlineClose`
- [scanner.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/scanner.ts) 的 `findBlockClose`
- [scanner.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/scanner.ts) 的 `findRawClose`
- [complex.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/complex.ts) 的 `tryParseComplexTag`

建议看这些值：

- `argClose`
- `contentStart`
- `end`
- `malformedCloseCandidate`

这类问题通常说明：

- close 行没独占整行
- 被转义的 close 被误判成真 close
- 嵌套 block / raw 时 depth 推进有误

### 6.3 怀疑“转义失效了”

现象：

- `\|` 还被当成参数分隔
- `\)` 提前闭合了
- `\%end$$` 没按字面文本保留

优先打 log 的地方：

- [escape.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/escape.ts) 的 `readEscapedSequence`
- [consumers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/consumers.ts) 的 `tryConsumeEscape`
- [builders.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/builders.ts) 的 `splitTokensByPipe`

建议看这些值：

- 当前 `i`
- `readEscapedSequence(...)` 的返回值
- `ctx.stack.length`
- `splitTokensByPipe(...)` 切出来的 `parts`

这类问题通常说明：

- 转义在太早的阶段被还原了
- `tryConsumeEscape` 在 tag 内外走了错误分支
- pipe 分参时把 `\|` 错当成了 `|`

### 6.4 怀疑“pipe 参数切错了”

现象：

- `link(url \| text)` 被切成两段
- `info(title | a | b)` 后半段没正确并进正文
- `date` / `fromNow` 参数错位

优先打 log 的地方：

- [builders.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/builders.ts) 的 `splitTokensByPipe`
- [builders.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/builders.ts) 的 `parsePipeArgs`
- [handlers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/handlers.ts)

建议看这些值：

- `parts.length`
- `parts` 的每一段文本内容
- `args.text(0/1/2)`
- `args.materializedTokens(...)`

这类问题通常说明：

- 分参规则错了
- materialize 太早了
- handler 吃参数数量和规则预期不一致

### 6.5 怀疑“handler 语义错了”

现象：

- tag 被识别出来了
- 但最终 token 字段不对
- 比如 `url`、`title`、`value` 不对

优先打 log 的地方：

- [handlers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/handlers.ts) 对应 tag 的 handler
- [consumers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/consumers.ts) 的 `finalizeClosedNode`
- [complex.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/complex.ts) 里 raw / block handler 调用处

建议看这些值：

- handler 收到的原始 `tokens` 或 `arg`
- handler 返回的 draft
- 最终 `createToken(...)` 前后的对象

这类问题通常说明：

- 语义解释写错了
- 默认 fallback 逻辑写错了
- raw / block 和 inline 的行为没有对齐

### 6.6 怀疑“fallback / 恢复策略不对”

现象：

- 坏标签后面的好标签没有恢复
- 未知标签没有正确去壳
- 未闭合 inline 吐回原文的方式不对

优先打 log 的地方：

- [consumers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/consumers.ts) 的 `finalizeClosedNode`
- [context.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/context.ts) 的 `finalizeUnclosedTags`
- [complex.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/complex.ts) 的返回结果

建议看这些值：

- `node.richType`
- `node.tokens`
- `fallbackText`
- `result.handled`
- `result.token`
- `result.nextIndex`

这类问题通常说明：

- 降级路径走错了
- unknown tag 和 known tag 的收口被混了
- EOF 时未闭合节点的回填顺序不对

### 6.7 怀疑“message 没弹 / 弹太多 / 合并错了”

现象：

- 明明有错误却没 toast
- 同一篇文章里疯狂刷屏
- 合并 message 顺序不对

优先打 log 的地方：

- [errors.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/errors.ts) 的 `emitI18nError`
- [errors.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/errors.ts) 的 `flushRichTextErrorBatch`
- [errors.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/errors.ts) 的 `shouldSilenceRichTextError`

建议看这些值：

- `key`
- `richTextErrorBatchEntries`
- `visibleEntries`
- `lastRichTextErrorAtByKey`
- `silent`

这类问题通常说明：

- 错误被 batch 吃掉了
- 5 秒静默生效了
- 当前调用走了 `silent = true`

### 6.8 怀疑“token 顺序或文本拼接怪了”

现象：

- 相邻文本碎成很多段
- token 顺序不对
- 解析结果看起来像少字或串行错位

优先打 log 的地方：

- [context.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/context.ts) 的 `pushTextToCurrent`
- [context.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/context.ts) 的 `flushBuffer`
- [blogFormat.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/blogFormat.ts) 主循环

建议看这些值：

- `ctx.buffer`
- `ctx.root`
- `ctx.stack`
- 当前写入的 `str`

这类问题通常说明：

- buffer flush 时机不对
- close 前后漏了 flush
- 文本 token 合并策略被破坏了

### 6.9 最推荐的最小 log 打法

如果你一时不知道从哪开始，先打这三个点，命中率最高：

1. [blogFormat.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/blogFormat.ts) 主循环里打印：
    - `i`
    - 当前字符
    - `stack.length`

2. [consumers.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/consumers.ts) 的 `finalizeClosedNode` 打印：
    - `node.tag`
    - `node.richType`
    - `node.tokens`

3. [builders.ts](/home/debian/newMainpage/src/shared/lib/dsl/BlogRichText/builders.ts) 的 `splitTokensByPipe` 打印：
    - 输入 tokens
    - 输出 parts

很多问题看完这三处，基本就能判断是：

- 扫描错了
- 分参错了
- 收口错了

---

## 8. 测试与验证 (Testing)

解析器的修改必须经过回归测试。

- **核心指令**: `pnpm run test:dsl`
- **逻辑位置**: 详见 `tests/blockDsl.golden.test.ts`。
- **Golden Test**: 该模块使用 Golden Test 机制。如果你的改动导致 Token 结构发生变化，测试会失败。请确认变化符合预期后，更新对应目录下的
  `.golden` 文件。

## 9. 典型边界情况 (Edge Cases)

在修改解析逻辑时，务必通过测试验证以下场景：

1. **括号嵌套**: `$$bold(text with (brackets) inside)$$` -> 应能正确识别内层括号并作为文字保留。
2. **转义序列**: `$$link(url \| text)$$` -> `\|` 应被识别为文字 `|` 而不是参数分隔符。
3. **转义闭合**: `$$bold(text with \))$$` -> `\)` 不应触发标签闭合。
4. **深度溢出**: 当嵌套深度超过 `depthLimit` 时，内层 DSL 应回退为原始文本显示，而不是导致解析崩溃。
5. **不匹配的闭合**: `$$bold(text))$$` -> 应能区分正常的 `)$$` 和多余的 `)`。
6. **独占行的 Block**:
   ```text
   $$collapse(Title)*
   Content
   *end$$
   ```
   `*end$$` 必须独占一行且没有多余空格才能被正确识别为 Block 结束。

---

## 10. 一句话记忆

这个目录可以这样背：

- `scanner` 看输入
- `consumer` 推流程
- `handler` 讲语义
- `builder` 做收口
- `error` 管体验

如果你改代码时一直守住这几个边界，就不容易再把自己写炸。
