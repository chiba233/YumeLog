# yumeLog (ユメログ)

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue%203-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E" />
</p>

一个基于 **Vue 3** + **TypeScript** + **Naive UI** + **Vite SSG** 构建的静态个人主页与自定义 DSL 博客系统。

yumeLog 的核心理念不是“把 Markdown 换个皮”，而是围绕这个项目本身的展示需求，拆出一套更适合静态个人站点的内容架构：

- 博客文章使用 **块级 DSL** 组织结构
- 正文内部使用 **Rich Text DSL** 处理强调、链接、提示块、代码块等富文本内容
- 首页与业务资源使用 **单文件 DSL / JSON** 管理

项目为纯静态网页，可低成本部署到 GitHub Pages、对象存储、CDN 或 Nginx。

---

## 特性速览 (Features Overview)

| Feature                 | Description                          |
|:------------------------|:-------------------------------------|
| **Static Architecture** | 纯静态架构，无需后端                           |
| **Vite SSG**            | 自动预渲染 HTML / sitemap / robots，SEO 友好 |
| **Custom DSL**          | 自定义块级 DSL + Rich Text DSL，适合本项目内容结构  |
| **Graceful Fallback**   | DSL 具备容错机制，语法错误尽量不让整页崩溃              |
| **Image Blocks**        | 图片块支持主链接与备用链接                        |
| **Responsive UI**       | 桌面端与移动端适配                            |
| **Theme System**        | 背景图与主题色联动                            |
| **Multi Language**      | 多语言内容支持                              |
| **Timeline Module**     | 纪念日 / 时间线展示                          |
| **Photo Wall**          | 照片墙 / 猫图模块                           |
| **Remote Data**         | 支持本地与远程内容资源加载                        |

---

## 视觉预览

<details>
<summary><b>桌面端视图</b> (点击展开)</summary>
<br>
<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/1.png" width="48%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/2.png" width="48%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/8.png" width="48%" />
</p>
</details>

<details>
<summary><b>移动端视图</b> (点击展开)</summary>
<br>
<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/3.png" width="30%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/4.png" width="30%" />
</p>
</details>

<details>
<summary><b>特色功能模块</b> (点击展开)</summary>
<br>
<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/5.png" width="30%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/6.png" width="30%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/7.png" width="30%" />
</p>
</details>

---

## 技术栈与环境

- **框架 & 语言**：Vue 3 / TypeScript
- **UI & 样式**：Naive UI
- **构建与预渲染**：Vite / Vite SSG
- **依赖管理**：pnpm
- **部署方式**：纯静态部署

说明：

- 当前博客内容与主内容资源的核心解析由自定义 DSL 完成
- `.json` 资源仍然按原生 JSON 处理
- 旧版本中部分 YAML 示例已过时，当前主资源文件以 `.dsl` 为主

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 本地开发

```bash
pnpm dev
```

### 3. 局域网调试

```bash
pnpm run dev:host
```

### 4. 生产构建

```bash
pnpm run build
```

### 5. 代码质量检查

```bash
pnpm lint
pnpm run typecheck
```

### 6. 验证命令

```bash
pnpm run verify
```

日常改动默认跑这个命令。它会运行 `eslint` 与默认单元测试（当前为 `test:dsl`）。

```bash
pnpm run build
```

只在需要验证 SSG、SEO、SSR 输出或构建链路时运行。它会执行类型检查、SSG 构建与 `test:ssg`。

```bash
pnpm run verify:build
```

先执行 `verify`，再执行完整 `build`。

### 7. TypeScript 约束

- 禁止提交 `as any`
- 非必要场景不要直接使用 `any`
- 遇到类型错误时，优先补全类型定义、收窄类型或抽出明确的类型守卫，不要用 `as any` 绕过检查
- 如果确实存在边界场景需要逃逸类型，必须先说明原因，并选择比 `as any` 更小范围、更可审计的写法

---

# DSL 总体架构 (DSL Architecture)

yumeLog 当前的内容系统可以理解为三层：

## 1. 博客块级 DSL

这一层负责把一篇博客文章拆成结构块，例如：

- `@meta`
- `@text`
- `@image`
- `@divider`

它解决的是“文章结构”问题，而不是正文富文本问题。

## 2. 博客 Rich Text DSL

这一层只在 `@text` 的内容内部生效。

它负责：

- 粗体
- 删除线
- 居中
- 链接
- 绝对日期格式化
- 相对时间格式化
- 提示块
- 折叠块
- 代码块

真正的正文内嵌套发生在这一层。

## 3. 单文件资源 DSL

这一层用于首页和业务资源，例如：

- `title.dsl`
- `introduction.dsl`
- `friends.dsl`
- `neko.dsl`
- `fromNow.dsl`

它不是博客文章系统，而是站点数据配置系统。

---

## DSL 解析流程 (Parsing Pipeline)

以博客文章为例，内容大致会经过以下流程：

```text
博客原文
   │
   ▼
块级 DSL 解析器（识别 @meta / @text / @image / @divider）
   │
   ▼
生成块级 AST
   │
   ▼
转换为 Post / PostBlock
   │
   ▼
若 block.type === text
   │
   ▼
Rich Text DSL 解析器（识别 $$bold(...)$$ / $$link(...)$$ / raw / block）
   │
   ▼
生成富文本 token 树
   │
   ▼
Vue 渲染输出
```

单文件资源 DSL 的流程类似，但不会转成 `Post`，而是转成业务数据结构。

---

# 博客块级 DSL 说明 (Block-level Blog DSL)

博客文章由多个 `@type` 块组成。

## 基础结构

```text
@meta
title: Hello DSL
time: 20260321
id: hello-dsl
lang: zh
@end

@text
这是一段正文。
@end

@divider
@end

@image
- src: /images/demo.webp
  desc: 示例图片
@end
```

## 可用块

| Block      | Description | 是否必选 |
|:-----------|:------------|:----:|
| `@meta`    | 文章元信息       | yes  |
| `@text`    | 正文文本块       |  no  |
| `@image`   | 图片块         |  no  |
| `@divider` | 分割线块        |  no  |

## 当前结构规则

博客块级 DSL 现在是 **平铺结构**：

- 不支持 `@text` 里再嵌 `@image`
- 不支持 `@image` 里再嵌别的块
- 每个块都是文章顶层块

也就是说，博客文章的结构嵌套不是在这一层完成的，而是在 `@text` 内部的 Rich Text DSL 中完成。

---

## `@meta` 详细说明

`@meta` 是每篇博客文章最重要的块，它负责定义文章的元信息。

示例：

```text
@meta
layout: common
time: 20260321
lang: zh
id: bangkok-life
pin: true
title: 曼谷的午后
@end
```

### 当前常用字段

| Field    | Type   | Description               |
|:---------|:-------|:--------------------------|
| `title`  | string | 文章标题，列表页与详情页显示用           |
| `time`   | string | 文章时间，通常写 `YYYYMMDD`       |
| `id`     | string | 文章唯一标识，推荐填写，用于路由与稳定链接     |
| `lang`   | string | 文章语言，如 `zh` / `en` / `ja` |
| `layout` | string | 布局类型，供页面层决定如何展示           |
| `pin`    | string | 是否置顶，通常写 `true` / `false` |

### 每个字段的用途

#### `title`

- 博客列表展示标题
- 文章详情页标题
- 路由和描述缓存的辅助字段

#### `time`

- 页面上显示文章日期
- 用于文章排序
- 当没有 `id` 时，也常参与生成稳定标识

#### `id`

- 推荐填写
- 用于生成更稳定的文章路由
- 用于生成更稳定的文章级 `temp_id`

#### `lang`

- 控制这篇文章渲染时使用的语言上下文
- 对正文和某些 UI 展示有影响

#### `layout`

- 供页面层决定展示方式
- 当前通常作为布局配置字段保留

#### `pin`

- 控制文章是否置顶
- 当前排序逻辑中，`pin: true` 的文章会优先显示

### 注意

- `@meta` 内部采用简单 `key: value` 形式
- 同名字段后写会覆盖前写，并输出警告
- `blocks` 是保留字段，不应在 `@meta` 中手动写入

---

## `@text`

`@text` 是博客正文块。

示例：

```text
@text
今天写了一篇新文章。
$$bold(这一段会加粗)$$
$$link(https://example.com | 点我访问)$$
@end
```

### 作用

- 承载文章正文
- 内部支持第二层 Rich Text DSL
- 会在前端懒解析并缓存富文本 token

### 注意

- 块级 DSL 不支持在 `@text` 中嵌别的博客块
- 但 `@text` 内容内部支持 Rich Text DSL 的嵌套

---

## `@image`

`@image` 使用 dash-list 语法描述图片列表。

示例：

```text
@image
- src: /images/main.webp
  spareUrl: https://cdn.example.com/main.webp
  desc: 一张图片
- src: /images/second.webp
  desc: 第二张图片
@end
```

### 字段说明

| Field      | Description |
|:-----------|:------------|
| `src`      | 主图片地址       |
| `spareUrl` | 备用图片地址      |
| `desc`     | 图片说明文字      |

### 多行字段

支持 `|` 写法：

```text
@image
- src: /images/demo.webp
  desc: |
    第一行说明
    第二行说明
@end
```

---

## `@divider`

分割线块通常写成：

```text
@divider
@end
```

它没有必须填写的内容，一般只用于视觉分隔。

---

# 博客 Rich Text DSL 说明

博客正文中的富文本 DSL 支持 **inline**、**raw**、**block** 三种形式。

---

## 1. Inline 语法

```text
$$type(content)$$
$$type(arg1 | arg2)$$
```

示例：

```text
$$bold(Hello World)$$
$$link(https://example.com | 点我访问)$$
$$date(2026-03-21||zh)$$
$$fromNow(2026-03-21T00:00:00.000Z|en)$$
```

---

## 2. Raw 语法

Raw 语法中的内容区不会继续按 Rich Text DSL 深入解析，适合代码块或需要保留原样文本的内容。

```text
$$type(args)%
content
%end$$
```

示例：

```text
$$raw-code(ts | example)%
const a = 1
%end$$
```

---

## 3. Block 语法

Block 语法适合真正需要承载多行结构内容的富文本组件。

```text
$$type(args)*
content
*end$$
```

示例：

```text
$$collapse(点我展开)*
这里是一段多行内容。
这里可以继续写。
*end$$
```

说明：

- Rich Text DSL 的 block 语法和博客的 `@type ... @end` 不是一回事
- `$$type(args)* ... *end$$` 仍然属于第二层正文 DSL
- `@text / @image / @meta` 属于第一层博客块 DSL

---

## 支持的 Rich Text 类型

| Type        | Description | 支持 Raw | 支持 Block | 支持嵌套 |
|:------------|:------------|:------:|:--------:|:----:|
| `bold`      | 粗体          |   no   |    no    | yes  |
| `thin`      | 细体          |   no   |    no    | yes  |
| `underline` | 下划线         |   no   |    no    | yes  |
| `strike`    | 删除线         |   no   |    no    | yes  |
| `center`    | 居中          |   no   |    no    | yes  |
| `code`      | 行内代码        |   no   |    no    | yes  |
| `link`      | 超链接         |   no   |    no    | yes  |
| `date`      | 日期格式化       |   no   |    no    |  no  |
| `fromNow`   | 相对时间格式化     |   no   |    no    |  no  |
| `info`      | 信息提示块       |  yes   |   yes    | yes  |
| `warning`   | 警告提示块       |  yes   |   yes    | yes  |
| `collapse`  | 折叠块         |  yes   |   yes    | yes  |
| `raw-code`  | 原始代码块       |  yes   |    no    |  no  |

---

## 常见 Rich Text 示例

### 粗体

```text
$$bold(Hello World)$$
```

### 链接

```text
$$link(https://example.com | 点我访问)$$
```

### 日期

```text
$$date(2026-03-21)$$
$$date(2026-03-21||th)$$
$$date(2026-03-21|YYYY/MM/DD|en)$$
```

### 相对时间

```text
$$fromNow(2026-03-21T00:00:00.000Z|en)$$
$$fromNow(2026-03-21|zh)$$
```

### 提示块

```text
$$info(标题 | 这里是提示内容)$$
```

### 警告块

```text
$$warning(注意 | 这里有需要注意的内容)$$
```

### 折叠块

```text
$$collapse(点我展开)*
这里是折叠内容
*end$$
```

### 原始代码块

```text
$$raw-code(ts | example)%
const a = 1
%end$$
```

---

## Rich Text 参数规则

Rich Text DSL 的参数分隔符是 `|`。

基础写法：

```text
$$type(arg1 | arg2)$$
```

需要注意的是，不同 tag 的参数规则并不完全一样。

### 单参数类型

以下类型本质上只接收一个正文参数：

- `bold`
- `thin`
- `underline`
- `strike`
- `center`
- `code`

示例：

```text
$$bold(Hello World)$$
$$code(const a = 1)$$
```

这些类型不做按 `|` 分参。

也就是说：

- 普通的 `|` 会按原始文本输出
- 转义后的 `\|` 也只是字面 `|`，不会触发额外语义

### `date`

标准写法：

```text
$$date(date | format | lang)$$
```

#### 参数含义

- 第一个参数：日期值
- 第二个参数：格式字符串，可选
- 第三个参数：语言，可选

#### fallback 规则

- `format` 为空时：使用当前语言对应的默认日期格式
- `lang` 为空时：默认按 `en` 处理

#### 默认格式

- `th`：`D MMMM BBBB - dddd`
- 其他当前支持语言：`LL - dddd`

#### 示例

```text
$$date(2026-03-21)$$
$$date(2026-03-21||th)$$
$$date(2026-03-21|YYYY/MM/DD|en)$$
```

说明：

- 推荐传入 `YYYY-MM-DD` 或完整 ISO 时间字符串
- `date` 的结果是纯文本，不会继续解析内部嵌套 Rich Text

### `fromNow`

标准写法：

```text
$$fromNow(date | lang)$$
```

#### 参数含义

- 第一个参数：日期值
- 第二个参数：语言，可选

#### fallback 规则

- `lang` 为空时：默认按 `en` 处理
- `date` 非法时：输出 `error`

#### 示例

```text
$$fromNow(2026-03-21T00:00:00.000Z|en)$$
$$fromNow(2026-03-21|zh)$$
```

说明：

- 相对时间是基于运行时当前时间计算的，例如“3 days ago”
- 推荐优先使用完整 ISO 时间字符串，避免时区带来的理解偏差
- `fromNow` 的结果是纯文本，不会继续解析内部嵌套 Rich Text

### `link`

标准写法：

```text
$$link(url | text)$$
```

#### 参数含义

- 第一个参数：URL
- 第二个参数：显示文本

#### 参数不足时的 fallback

如果只写一个参数：

```text
$$link(https://example.com)$$
```

那么显示文本会 fallback 为 URL 本身。最终效果等价于：

```text
url = https://example.com
text = https://example.com
```

#### 参数过多时

如果写了超过两个参数：

```text
$$link(https://example.com | hello | world)$$
```

解析器会把第二个及后续参数合并为显示内容。效果近似于：

```text
url = https://example.com
text = helloworld
```

#### 建议

- URL 参数尽量写纯文本
- 显示文本可以包含嵌套 Rich Text DSL

推荐示例：

```text
$$link(https://example.com | $$bold(点我访问)$$)$$
```

### `info` / `warning` / `collapse` 的 inline 写法

标准写法：

```text
$$info(title | content)$$
$$warning(title | content)$$
$$collapse(title | content)$$
```

#### 参数含义

- 第一个参数：标题
- 第二个参数：正文

#### 参数不足时的 fallback

如果只传一个参数：

```text
$$info(这里只有正文)$$
```

那么：

- 标题会自动 fallback 为当前语言的默认标题
- 你写入的内容会作为正文显示

也就是说，这种写法不会丢内容，只是标题不再由你自定义。

#### 参数过多时

如果写了多个 `|`：

```text
$$warning(标题 | 第一段 | 第二段 | 第三段)$$
```

解析器会把第二段及之后的部分全部合并进正文内容。

这里的分参规则也遵循同一套转义逻辑：

- 没转义的 `|` 会继续作为参数分隔符
- 转义后的 `\|` 只作为原始文本的一部分保留

### `info` / `warning` / `collapse` 的 raw / block 写法

#### Raw

```text
$$info(title)%
content
%end$$
```

#### Block

```text
$$collapse(title)*
content
*end$$
```

#### 参数规则

- 这两种写法只把括号中的内容当作标题参数
- 内容主体来自 `% ... %end$$` 或 `* ... *end$$` 之间的正文

#### 标题 fallback

如果标题为空：

```text
$$info()%
正文
%end$$
```

则会 fallback 为当前语言的默认标题。

### `raw-code`

标准写法：

```text
$$raw-code(lang | title | label)%
code
%end$$
```

#### 参数含义

- 第一个参数：代码语言
- 第二个参数：标题
- 第三个参数：标签

#### fallback 规则

- 语言为空时：默认 `typescript`
- 标题为空时：默认 `Code:`
- 标签为空时：留空

#### 语言别名

以下语言别名会归一化到 `typescript`：

- `js`
- `javascript`
- `ts`
- `typescript`

#### 当前支持的代码语言

- `typescript`
- `bash`
- `json`
- `yaml`
- `vue`
- `html`
- `text`

如果写了不支持的语言，页面会提示 warning，并回退到 `text`。

---

## Rich Text 参数规则速查表

| Type        | 推荐写法                                             | 参数说明                     | 参数不足时                                 | 参数过多时         |
|:------------|:-------------------------------------------------|:-------------------------|:--------------------------------------|:--------------|
| `bold`      | `$$bold(text)$$`                                 | `text`                   | 无特殊 fallback                          | 不建议传多参数       |
| `thin`      | `$$thin(text)$$`                                 | `text`                   | 无特殊 fallback                          | 不建议传多参数       |
| `underline` | `$$underline(text)$$`                            | `text`                   | 无特殊 fallback                          | 不建议传多参数       |
| `strike`    | `$$strike(text)$$`                               | `text`                   | 无特殊 fallback                          | 不建议传多参数       |
| `center`    | `$$center(text)$$`                               | `text`                   | 无特殊 fallback                          | 不建议传多参数       |
| `code`      | `$$code(text)$$`                                 | `text`                   | 无特殊 fallback                          | 不建议传多参数       |
| `link`      | `$$link(url \| text)$$`                          | `url`, `text`            | `text` fallback 为 `url`               | 多余参数合并进显示内容   |
| `date`      | `$$date(date \| format \| lang)$$`               | `date`, `format`, `lang` | `format` 为空时按语言默认格式，`lang -> en`      | 第三个之后的参数不建议使用 |
| `fromNow`   | `$$fromNow(date \| lang)$$`                      | `date`, `lang`           | `lang -> en`                          | 第二个之后的参数不建议使用 |
| `info`      | `$$info(title \| content)$$`                     | `title`, `content`       | 标题 fallback 为默认文案                     | 多余参数合并进正文     |
| `warning`   | `$$warning(title \| content)$$`                  | `title`, `content`       | 标题 fallback 为默认文案                     | 多余参数合并进正文     |
| `collapse`  | `$$collapse(title \| content)$$`                 | `title`, `content`       | 标题 fallback 为默认文案                     | 多余参数合并进正文     |
| `raw-code`  | `$$raw-code(lang \| title \| label)% ... %end$$` | `lang`, `title`, `label` | `lang -> typescript`，`title -> Code:` | 第三个之后的参数不建议使用 |

---

## Rich Text 容错策略

### 未知标签

如果写了：

```text
$$unknown(hello world)$$
```

当前行为是：

- 前端输出 warning
- 去掉未知标签外壳
- 最终只显示 `hello world`

### 未闭合标签

如果标签结构不完整，解析器会尽量保留可读文本，而不是让整段内容消失。

### 深度过深

解析器会限制递归深度，超过限制时会降级处理，避免极端输入拖垮页面。

### Raw / Block 未闭合

会退化为普通文本或部分可恢复内容，并输出错误提示。

---

# 转义与语法边界

## 1. Rich Text 转义规则

Rich Text DSL 中常见需要转义的内容有：

- `(`
- `)`
- `|`
- `\`
- `%end$$`
- `*end$$`

也就是说，如果你想在正文里把这些内容当普通文本输出，而不是让解析器把它们当语法的一部分，就需要在前面加 `\`。

### 转义 `|`

```text
$$info(这是一道 \| 分隔线 | 正文内容)$$
```

效果：

- 标题中会显示 `|`
- 不会把这个 `|` 当作参数分隔符

### 转义 `)`

```text
$$bold(这是一个右括号 \))$$
```

效果：

- 正文里会显示 `)`
- 不会让标签提前闭合

### 转义反斜杠本身

```text
$$code(C:\\Users\\Admin)$$
```

效果：

- 会显示真实的 `\`

### 转义 raw 结束符

如果你在 raw 内容里需要展示 `%end$$` 本身，可以写：

```text
$$raw-code(text | demo)%
\%end$$
%end$$
```

### 转义 block 结束符

如果你在 block 内容里需要展示 `*end$$` 本身，可以写：

```text
$$collapse(示例)*
\*end$$
*end$$
```

### 一个完整示例

```text
$$warning(标题里有 \| 竖线 | 正文里有右括号 \) 和反斜杠 \\ )$$
```

当前解析器会把这些转义恢复成真实字符后再渲染。

## 2. 转义块级指令

如果你需要在博客块内容中输出看起来像 `@image` 的文本，而不是让它被识别成块指令，可以在行首加反斜杠：

```text
@text
\@image
@end
```

它会显示成：

```text
@image
```

## 3. 闭合标记必须独占一行

以下闭合标记都要求：

- 顶格
- 独占一整行
- 前面不能有空格
- 后面不能有额外字符

合法示例：

```text
@end
%end$$
*end$$
```

非法示例：

```text
 @end
%end$$ hello
 *end$$
```

---

# 单文件资源 DSL 说明

除博客文章外，首页和业务资源也可以通过 DSL 管理。

常见文件：

- `title.dsl`
- `introduction.dsl`
- `friends.dsl`
- `neko.dsl`
- `fromNow.dsl`

---

## `title.dsl`

```text
@title
- type: zh
  content: 天气真好啊，我们去散步吧
- type: en
  content: Nice weather today
@end
```

---

## `introduction.dsl`

```text
@introduction
- type: zh
  content: |
    这是多行介绍。
    第二行内容。
- type: en
  content: |
    This is the introduction.
@end
```

---

## `friends.dsl`

```text
@friends
- name: Alice
  alias: Alice
  url: https://example.com
  icon: /images/alice.webp
  spare: https://cdn.example.com/alice.webp
@end
```

---

## `neko.dsl`

```text
@img
- imgError: /cat/a.webp
  img: https://example.com/a.webp
  imgName: cat-a
@end
```

---

## `fromNow.dsl`

`fromNow.dsl` 是当前单文件资源中结构最复杂的一种，支持有限嵌套。

```text
@fromNow
@event
time: 20200101
photo: /img/a.webp
@names
- type: zh
  content: 认识的那一天
- type: en
  content: The first day we met
@end
@end
@end
```

说明：

- `fromNow` 可以包含 `event`
- `event` 可以包含 `names`
- `names` 里再使用 dash-list 描述多语言文本

---

# 空白、换行与容错

## 空白与换行

当前块级 DSL 的基本行为是：

- 正文内部换行会保留
- 中间空行会保留
- 块尾多余空行会被裁掉
- 指令行本身不会进入正文内容

## 块级 DSL 容错

- 多余的 `@end` 会报错，但不会让整篇文章中断
- 不允许的嵌套会报错，并尽量按普通文本保留
- 未闭合块会在文件结束时尽量自动恢复

## 单文件 DSL 容错

- 格式错误的行会报错
- 其他合法数据仍会继续解析

## Rich Text DSL 容错

- 未知标签去壳保留内容
- 未闭合标签尽量保留为文本
- raw / block 未闭合会降级

---

# temp_id 是什么

项目中很多解析结果会附带 `temp_id`。

它主要用于：

- Vue `v-for` 的稳定 `key`
- 前端运行时缓存

需要注意：

- `temp_id` 不是数据库主键
- 更适合同一次解析过程中的前端使用

当前常见带 `temp_id` 的内容包括：

- 博客块
- 图片项
- 处理后的文章对象
- 首页资源列表项
- 时间轴项

---

# 内容配置与文件位置

## 1. 资源入口配置

文件位置：

- `/public/data/config/yamlUrl.json`

示例：

```json
{
  "blog": {
    "listUrl": "https://raw.githubusercontent.com/chiba233/mainpageData/refs/heads/master/blog/list.json",
    "url": "https://raw.githubusercontent.com/chiba233/mainpageData/refs/heads/master/blog/",
    "spareUrl": "/data/blog/",
    "spareListUrl": "/data/blog/list.json"
  },
  "main": {
    "url": "/data/main/",
    "spareUrl": "",
    "listUrl": ""
  }
}
```

说明：

- `blog` 指向博客文章目录与列表
- `main` 指向首页等单文件资源目录

## 2. 博客列表

博客列表由 `list.json` 驱动。

添加新文章时：

1. 新建文章文件
2. 将文件名加入 `list.json`

## 3. 主资源目录

当前主资源目录通常为：

- `/public/data/main`

常见文件：

- `title.dsl`
- `introduction.dsl`
- `friends.dsl`
- `neko.dsl`
- `fromNow.dsl`
- `webTitle.json`

说明：

- `.dsl` 文件由 DSL parser 处理
- `.json` 文件由原生 JSON 处理

---

# 部署说明

如果使用 Vue Router History 模式，部署到 Nginx 时可参考：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/yumeLog/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## License

MIT
