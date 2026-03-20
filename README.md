# 🌙 yumeLog (ユメログ)

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue%203-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
</p>

一个基于 **Vue 3** + **TypeScript** + **Naive UI** + **Vite SSG** 构建的高颜值个人主页与自制 **RICH-TEXT-DSL** 博客系统。

本项目为纯静态网页，可实现极低成本部署。通过 `vite-SSG` 预渲染技术，在每次编译时自动生成包含所有文章的 HTML、`sitemap.xml` 与 `robots.txt`，实现全站级 SEO 优化，搜索引擎与各类社交软件分享抓取都能稳定适配。

---

## 🌟 特性速览 (Features Overview)

| Feature | Description |
|:--|:--|
| **Static Architecture** | 纯静态博客架构，极低成本，无后端部署 |
| **Vite SSG** | 自动预渲染 HTML / sitemap / robots，SEO 完备 |
| **Custom DSL** | 拒绝传统臃肿 Markdown，自造轻量级 RICH-TEXT DSL |
| **Nested Rendering** | 核心引擎支持无限嵌套语法解析 |
| **Image Blocks** | 图像块完美支持主干与双轨容灾备用地址 |
| **Responsive UI** | 全端响应式设计，深度适配移动端与毛玻璃交互 |
| **Theme System** | 灵活的主题系统：背景壁纸 + 对应全场景主题色覆盖 |
| **Multi Language** | 抛弃繁重框架，自制轻量级 i18n |
| **Anniversary Timeline** | 专属纪念日时间轴 |
| **Photo Wall** | 专为晒猫与个人照片设计的照片墙展示 |
| **Social Links** | 全域联系方式收纳，支持 Web3 钱包地址展示 |
| **Remote Data** | 灵活的数据双轨：支持从本地、CDN 或 HTTP 动态拉取 YAML |
| **Maimai Module** | MaiMai DX AQUA API 接入 |

---

## 📸 视觉预览

<details>
<summary><b>💻 桌面端视图</b> (点击展开)</summary>
<br>
<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/1.png" width="48%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/2.png" width="48%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/8.png" width="48%" />
</p>
</details>

<details>
<summary><b>📱 移动端视图</b> (点击展开)</summary>
<br>
<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/3.png" width="30%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/4.png" width="30%" />
</p>
</details>

<details>
<summary><b>🧩 特色功能模块 (Maimai / 纪念日 / 照片墙)</b> (点击展开)</summary>
<br>
<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/5.png" width="30%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/6.png" width="30%" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/7.png" width="30%" />
</p>
</details>

---

## 🛠️ 技术栈与环境

- **框架 & 语言**：Vue 3 (Composition API) / TypeScript (Strict Mode)
- **UI & 样式**：Naive UI（针对毛玻璃美学与移动端进行魔改）
- **构建 & SEO**：Vite 7 / Vite SSG
- **数据处理**：`js-yaml`  
  仅用于解析非富文本内容。由于自研递归 DSL 语法并不适合直接完全交给 YAML 处理，因此富文本部分由自研 Parser 全权接管。
- **依赖管理**：`pnpm` (>= 10.0.0), Node.js (>= 24.0.0)

---

## 🚀 极速启动与部署

本项目强依赖 **pnpm**，请确保环境配置正确。

### 1. 本地开发

```bash
pnpm install
pnpm dev

# 局域网移动端调试
pnpm run host
```

### 2. 生产环境构建

```bash
# 方案 A：完整构建（严格类型检查 + SSG SEO 优化）—— 推荐
vue-tsc --noEmit && vite-ssg build

# 方案 B：仅基础构建（不执行 SSG）
vite build

# 方案 C：对已有 dist 目录进行 SSG 补全
vite-ssg build
```

### 3. 代码质量检查

```bash
pnpm lint
pnpm type-check
```

### 4. 部署 Nginx 配置参考

项目采用 Vue Router History 模式，部署到 Nginx 时需添加以下配置避免刷新 404：

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

# 自研 DSL 语法指南 (DSL Grammar)

yumeLog 采用块级架构与自研 DSL 引擎渲染博客文本。文章可以指定 `id` 以便路由访问，也可以直接使用文章标题作为页面链接，但这两者至少必须提供一个。

---

## DSL 速查 (Quick Reference)

### Inline 语法

```text
$$type(content)$$
$$type(arg1 | arg2)$$
```

### Raw 语法

```text
$$type(arg1 | arg2)%
content
%end$$
```

### Block 语法

```text
@type
content
@end
```

### Block DSL 语法（结构级 DSL）

```text
$$type(args)*
content
*end$$
```

### 闭合规则总览

以下闭合标记都必须满足：

- **顶格**
- **独占一整行**
- **前面不能有空格**
- **后面不能有额外字符**
- **不能缩进**
- **不能同行追加说明**

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

## DSL 容错策略 (Error Tolerance)

yumeLog 的 DSL 采用 **宽容解析策略 (Permissive Parsing)**。

设计原则：

> 解析器会尽量渲染内容，而不是因为语法错误直接中断解析。

这意味着即使 DSL 写法不完全合法，系统仍然会尝试生成可用输出，并在 Web 端输出警告信息。

### 行为规则

解析器遇到异常时会按以下优先级处理：

1. **尽量保持文本可读**
2. **保留原始内容**
3. **输出错误日志**

### 非法 Tag

如果 DSL 类型未注册，例如：

```text
$$something(hello world)$$
```

解析器不会抛出致命错误，而是：

- 在 Web 输出 warning
- 将该内容作为普通文本渲染

最终页面仍然可以正常显示。

### 结构错误

如果 DSL 嵌套结构不完整，例如：

```text
$$bold(hello
```

解析器会停止当前 DSL 解析，并将剩余部分当作普通文本处理，直到下一个合法闭合标签。

### 参数异常

如果参数数量异常：

- **不足参数** → 自动 fallback
- **多余参数** → 合并到最后一个参数

例如：

```text
$$info(title | text | extra)$$
```

最终解析为：

```text
title = "title"
text = "textextra"
```

### RAW Block 异常

如果 RAW Block 未正确闭合，例如：

```text
$$raw-code(js)%
console.log("hello")
```

解析器会把整个 RAW block 当作普通文本输出，并记录错误日志。

### Block DSL 异常

如果结构级 DSL 未正确闭合，例如：

```text
$$spoiler(title)*
这里是内容
```

解析器会将其降级为普通文本或部分可恢复结构，并输出错误日志，避免整体页面崩溃。

### 为什么采用宽容解析

DSL 的主要目标是 **博客写作体验**，而不是严格编程语言。

因此：

- 用户不需要担心小语法错误
- 页面不会因为 DSL 失误而完全崩溃
- 内容始终保持可读

这种设计理念与 HTML、Markdown 的容错思想类似。

---

## DSL 解析流程 (Parsing Pipeline)

yumeLog 的富文本系统不是简单字符串替换，而是一个递归解析引擎。  
DSL 文本会先被转换为 **Rich-Text AST（抽象语法树）**，再渲染为 Vue 组件。

解析流程如下：

```text
Raw Text
   │
   ▼
Tokenizer (识别 `$$type(...)$$` / `$$type(...)%` / `$$type(...)*` 结构)
   │
   ▼
AST Builder (递归解析嵌套 DSL)
   │
   ▼
Argument Parser (解析 | 参数系统)
   │
   ▼
Renderer (转换为 Vue 渲染结构)
   │
   ▼
HTML Output
```

### 1. Tokenizer

扫描文本并识别 DSL 指令，例如：

```text
$$bold(Hello)$$
```

会被识别为：

```text
type: bold
content: Hello
```

普通文本会作为 Text Token 保留。

### 2. AST 构建

解析器会递归解析嵌套 DSL，例如：

```text
$$bold($$underline(Hello)$$)$$
```

解析结构：

```text
bold
 └ underline
     └ Hello
```

因此 DSL 可以无限嵌套。

### 3. 参数解析

DSL 支持使用 `|` 传递多个参数，例如：

```text
$$link(url | text)$$
```

解析为：

```text
[url, text]
```

注意：`|` 只会在 **纯文本 token** 中被识别，因此不会破坏嵌套结构。

### 4. 渲染阶段

最终 AST 会交给对应渲染器，将 DSL 节点转换为 Vue 渲染结构，例如：

- `bold` → `<b>`
- `link` → `<a>`
- `info` → InfoBox 组件

最终输出为 HTML。

---

## DSL 基础语法

### 基础语法

```text
$$type(content)$$
```

示例：

```text
$$bold(Hello World)$$
```

### 嵌套语法

所有常规 type 均支持无限嵌套。

示例：

```text
$$bold($$underline(Hello)$$)$$
```

### 拼接语法

```text
$$link(URL | content)$$
$$info(我去，这怎么是 title | 哇哦我是正文欸)$$
```

示例：

```text
$$link(https://example.com | 点我访问)$$
```

### 严格注意

- **URL**：绝对不能嵌套，必须在第一层级声明
- **content**：可以嵌套其他指令
- 正确复合示例：

```text
$$link(https://google.com | $$bold(Google)$$)$$
```

- 如果你传入：

```text
$$info(我去，这怎么是 title | 哇哦我是正文欸 | 欸我又跳出来了 | 欸我又进去了)$$
```

由于 `info` 只接受 `title` 和 `正文` 两个参数，所以正文最终会显示为：

```text
哇哦我是正文欸欸我又跳出来了欸我又进去了
```

---

## Raw Code Block / Raw DSL 语法

Raw block 内部 **不会解析任何 DSL 指令**。

理论上很多基础语法都可以扩展成 Raw 版本，但实际项目中只为真正有使用价值的类型提供 Raw Support。

### 基础写法

```text
$$raw-code(lang | title)%
content
%end$$
```

### 示例

```text
$$raw-code(ts | example)%
const a = 1
%end$$
```

### 其他支持 Raw 的 DSL 示例

```text
$$info(你好，我是标题)%
content
%end$$
```

### 非法闭合示例

```text
$$info(你好，我是标题)%
content
 %end$$
```

上例中 `%end$$` 前面多了一个空格，因此不会被视为合法闭合。

### RAW 闭合规则

`%end$$` 必须满足以下条件：

- 顶格
- 独占一整行
- 前面不能有空格
- 后面不能有任何字符

也就是说，这样才合法：

```text
%end$$
```

而这些都不合法：

```text
 %end$$
%end$$ hello
```

---

## Block DSL 语法（结构级 DSL）

除了 inline 与 raw 之外，yumeLog 还支持 **结构级 DSL**：

```text
$$type(args)*
content
*end$$
```

这种语法适合真正需要承载多行结构内容的 DSL。

### 示例

```text
$$spoiler(点我展开)*
这里是隐藏内容
*end$$
```

### Block 闭合规则

`*end$$` 必须满足以下条件：

- 顶格
- 独占一整行
- 前面不能有空格
- 后面不能有任何额外字符

合法示例：

```text
*end$$
```

非法示例：

```text
 *end$$
*end$$ more
```

### 适用场景

Block DSL 更适合：

- 折叠块
- 多行警告块
- 复杂引用块
- 自定义布局区块
- 未来扩展的结构级组件

---

## 支持的 Type 清单

| Type          | Description | 是否支持 Raw 语法 | 是否支持 Block 语法 | 是否支持嵌套语法 | 可以传入的参数                          |
|:--------------|:------------|:-----------:|:-------------:|:--------:|:---------------------------------|
| **bold**      | 粗体          |     no      |      no       |   yes    | `(text)`                         |
| **thin**      | 细体          |     no      |      no       |   yes    | `(text)`                         |
| **underline** | 下划线         |     no      |      no       |   yes    | `(text)`                         |
| **strike**    | 删除线         |     no      |      no       |   yes    | `(text)`                         |
| **center**    | 居中对齐        |     no      |      no       |   yes    | `(text)`                         |
| **code**      | 行内代码        |     no      |      no       |   yes    | `(text)`                         |
| **link**      | 超链接         |     no      |      no       |   yes    | `(URL \| text)`                  |
| **info**      | 基础信息提示框     |     yes     |      yes      |   yes    | `(title \| text)` 或 `(title)%正文` |
| **warning**   | 警告提示框       |     yes     |      yes      |   yes    | `(title \| text)` 或 `(title)%正文` |
| **raw-code**  | 原始代码块       |     yes     |      no       |    no    | `(code-lang \| code-title)%正文`   |

> 说明：  
> 当前项目中最稳定、最常用的是 **inline** 与 **raw**。  
> **block 语法已经纳入语法体系说明**，适合作为后续扩展结构级 DSL 的统一规范。

---

## DSL 类型详解

### `bold`

用于渲染粗体文本。

```text
$$bold(text)$$
```

- 支持嵌套：yes
- 支持 Raw：no
- 支持 Block：no

示例：

```text
$$bold(Hello World)$$
```

---

### `thin`

用于渲染细体文本。

```text
$$thin(text)$$
```

- 支持嵌套：yes
- 支持 Raw：no
- 支持 Block：no

---

### `underline`

用于渲染下划线文本。

```text
$$underline(text)$$
```

- 支持嵌套：yes
- 支持 Raw：no
- 支持 Block：no

---

### `strike`

用于渲染删除线文本。

```text
$$strike(text)$$
```

- 支持嵌套：yes
- 支持 Raw：no
- 支持 Block：no

---

### `center`

用于渲染居中对齐内容。

```text
$$center(text)$$
```

- 支持嵌套：yes
- 支持 Raw：no
- 支持 Block：no

---

### `code`

用于渲染行内代码。

```text
$$code(text)$$
```

- 支持嵌套：yes
- 支持 Raw：no
- 支持 Block：no

---

### `link`

用于渲染超链接。

```text
$$link(URL | text)$$
```

规则：

- 第一个参数 `URL` 必须为纯文本
- 第二个参数 `text` 可以嵌套其他 DSL
- URL 不能嵌套

正确示例：

```text
$$link(https://google.com | $$bold(Google)$$)$$
```

错误用法示例：

```text
$$link($$bold(https://google.com)$$ | Google)$$
```

---

### `info`

用于渲染基础信息提示框。

#### Inline 写法

```text
$$info(title | text)$$
```

#### Raw 写法

```text
$$info(title)%
content
%end$$
```

- 支持嵌套：yes
- 支持 Raw：yes
- 支持 Block：可扩展

---

### `warning`

用于渲染警告提示框。

#### Inline 写法

```text
$$warning(title | text)$$
```

#### Raw 写法

```text
$$warning(title)%
content
%end$$
```

- 支持嵌套：yes
- 支持 Raw：yes
- 支持 Block：可扩展

---

### `raw-code`

用于渲染原始代码块。

```text
$$raw-code(lang | title)%
content
%end$$
```

规则：

- 内容区不会解析任何 DSL
- 不支持嵌套
- 必须以 `%end$$` 顶格独占一行闭合

---

## 参数解析与 Fallback 规则

DSL 在解析时会执行 **参数拆分与容错处理**。  
为了保证 DSL 在各种输入情况下都能稳定运行，解析器定义了一套明确的 fallback 规则。

### 1. 单参数 DSL

当 DSL 只定义 **一个参数** 时：

```text
$$bold(hello world)$$
```

解析器会把整个内容视为一个参数，不进行拆分。

### 2. 多参数 DSL

当 DSL 定义多个参数时，使用 `|` 分隔：

```text
$$link(https://google.com | Google)$$
```

解析结果为：

```text
url = "https://google.com"
text = "Google"
```

### 3. 参数数量不足

当 DSL 需要多个参数，但只提供 **一个参数** 时，解析器会执行 fallback：

```text
$$link(https://google.com)$$
```

`text` 会 fallback 为 `url`。  
最终渲染效果等价于：

```html
<a href="https://google.com">https://google.com</a>
```

### 4. 参数数量过多

当参数数量 **超过 DSL 定义数量** 时，额外参数会被 **合并到最后一个参数**。

```text
$$info(title | text | extra | more)$$
```

解析结果：

```text
title = "title"
text = "textextramore"
```

### 5. `|` 分隔符解析规则

`|` 只会在 **纯文本 token** 中被识别。  
这意味着：

```text
$$link(url | $$bold(hello | world)$$)$$
```

内部的 `|` 不会影响外层参数解析。

### 6. 空参数处理

```text
$$info(|hello)$$
```

解析结果：

```text
title = ""
text = "hello"
```

是否允许空值取决于 DSL 类型本身。

### 7. 未注册 DSL 类型

如果解析器遇到未注册 DSL，整个 DSL 会被当作普通文本输出，不会进行任何渲染，避免解析器崩溃。

### 8. URL 参数限制

对于 `link` 这样的 DSL，URL **必须是纯文本 token**，不能嵌套 DSL。

---

## 🛡️ 转义机制与边界保护 (Escape Guide)

为了让 Parser 能够精确处理文本逻辑，引擎引入了转义机制。  
当你想在内容中输出语法关键字本身时，必须使用反斜杠 `\`。

### 1. 保护 DSL 闭合标记 `)`

如果你想在参数内使用 `)` 并且不希望它提前触发 `)$$` 闭合，可以使用 `\)`：

```text
$$warning(报错啦 | 此函数的结尾包含一个转义括号： \)$$ )$$
```

渲染结果中的文本将保留 `)`。

### 2. 保护管道符 `|`

管道符 `|` 是多参数 DSL 的天然切割器。  
如果标题或正文中正好需要展示 `|`，则必须转义为 `\|`：

```text
$$info(这是一道 \| 分割线 | 哇哦我是正文欸)$$
```

渲染结果中标题为：

```text
这是一道 | 分割线
```

### 3. 渲染真实的反斜杠 `\`

在代码演示场景下，如果你需要向用户展示真实的反斜杠，需要使用双反斜杠 `\\`：

```text
$$info(路径说明 | 请访问 C:\\\\Users\\\\Admin 文件夹)$$
```

渲染结果类似：

```text
C:\Users\Admin
```

### 4. 保护块级结构 `@`

在 `@text` 或 `@image` 这样的块级结构中，如果行首需要输出 `@type` 形式文本，可能导致结构误判，此时可以在行首使用 `\` 保护：

```text
@text
\@image 这个符号现在只是一段纯文本了！
\\@text 即使是双重转义，最后也会被降级还原。
@end
```

### 5. 保护结构级闭合符

如果正文中需要展示 `%end$$`、`*end$$`、`@end` 这些闭合标记本身，请避免将它们单独顶格放置在一行，否则可能触发结构闭合。  
推荐：

- 放在行内文本中
- 加前缀文本
- 或使用 Raw Code Block 展示

---

## 🏗️ 块级架构语法指南 (Block-level Syntax)

yumeLog 采用自研的 **块驱动架构 (Block-driven Architecture)**。  
文章由多个独立的 `@type` 块组成，这种设计让静态页面也能拥有很强的组件化能力和解析效率。

### 1. 基础结构 (Base Structure)

每个块必须以 `@` 符号开始，并以 `@end` **顶格独立占行**闭合。

### 2. 标准块清单 (Available Blocks)

| 块指令 (@type) | 角色定位 | 内部语法要求 | 是否必选 |
|:--|:--|:--|:--:|
| **@meta** | 文章元数据 | **YAML**（定义 id, title, time 等） | **YES** |
| **@text** | 富文本正文 | **DSL** + 纯文本（支持嵌套） | NO |
| **@divider** | 逻辑分割线 | 留空即可 | NO |
| **@image** | 多轨媒体块 | **YAML List**（支持容灾链接） | NO |

---

### 文章元信息 (`@meta`)

每篇文章 **必须** 以 `@meta` 开头，用于驱动 SEO、路由映射及页面布局。

```text
@meta
layout: common
time: 20260316
lang: zh
id: bangkok-life
pin: true
title: 曼谷的午后喵
@end
```

字段说明：

- `layout`：布局模板
- `time`：日期，格式为 `YYYYMMDD`
- `lang`：语言，如 `zh` / `en` / `ja`
- `id`：唯一 ID，用于路由访问
- `pin`：是否置顶
- `title`：文章标题

---

### 富文本容器 (`@text`)

渲染引擎的核心容器。  
内部支持所有 DSL 指令，负责承载主要文字内容。

```text
@text
这是一段普通的文字。
$$center($$bold(这是居中且加粗的文字喵！))$$
@end
```

---

### 容灾图像块 (`@image`)

专为图片高可用设计，支持定义主地址与热备地址。  
由于该部分由 YAML 解析，请遵循标准 YAML 缩进规范：

- `- `：创建一个对象组
- `  `：两个空格，为当前对象组添加字段
- `    `：四个空格，用于多行元素缩进

```text
@image
- src: /images/main.webp
  spareUrl: https://cdn.example.com/backup.webp
  desc: 三花猫 Mīkè 的日常
- desc: |
    多行描述演示：
    第一行
    第二行
@end
```

---

### 视觉分割线 (`@divider`)

```text
@divider
@end
```

---

## Block-level 闭合规则总结

### `@end`

必须：

- 顶格
- 独占一整行
- 前面不能有空格
- 后面不能有额外字符

### `%end$$`

必须：

- 顶格
- 独占一整行
- 前面不能有空格
- 后面不能有额外字符

### `*end$$`

必须：

- 顶格
- 独占一整行
- 前面不能有空格
- 后面不能有额外字符

### 示例总览

合法：

```text
@end
%end$$
*end$$
```

非法：

```text
 @end
%end$$ xxx
  *end$$
```

---

## 核心配置与自定义指南

由于 **yumeLog 是纯前端静态架构（无后端）**，所有数据均通过仓库中的本地文件或远程 JSON/YAML 驱动。  
如果需要修改内容，请严格按照以下说明操作。

### 1. 添加博客文章

**注意：** 要使用博客前，你必须先在 `/public/data/config/yamlUrl.json` 指向正确的远程目录及热备目录。

```json
{
  "blog": {
    "listUrl": "https://YOUR-BLOG-LIST-URL",
    "url": "https://YOUR-BLOG-URL",
    "spareUrl": "/blog/",
    "spareListUrl": "/blog/list.json"
  },
  "main": {
    "listUrl": "/data/main/list.json",
    "url": "/data/main/"
  }
}
```

操作步骤：

1. 在博客目录创建新的 YAML 文件（例如 `20260106.yaml`）
2. 按照项目定义的 `blocks` 结构编写文章内容
3. **手动修改 `list.json`**，将新的文章文件名添加进去，否则文章不会被系统加载

```json
[
  "20251201.yaml",
  "20260106.yaml"
]
```

---

### 2. I18N 多语言管理

**文件位置：** `/public/data/config/i18nLang.json`

默认支持中文、English、日本語。  
如果不需要某个语言，**直接从 JSON 中删除即可**，对应选项会自动从前端消失。

```json
[
  {
    "label": "中文",
    "value": "zh"
  },
  {
    "label": "English",
    "value": "en"
  }
]
```

---

### 3. 修改主题

**文件位置：** `/public/data/config/colorData.json`

**强制要求：**

- 背景图片必须严格按照 `background0.xxx` 的顺序命名并放入 `/public/` 目录
- 每张背景图必须有对应主题色，否则系统无法工作

```json
{
  "background0": "#C7B0C0",
  "background1": "#9E8A95",
  "background2": "#BF948E"
}
```

---

### 4. 修改网页标题

**文件位置：** `/public/data/main/webTitle.json`

用于控制浏览器标签页标题以及部分全局显示名称。

```json
{
  "home": {
    "zh": "YumeLOG的页面",
    "en": "YumeLOG Pages",
    "ja": "YumeLOG - ホーム",
    "other": "YumeLOG Pages"
  },
  "blog": {
    "zh": "YumeLOG的博客",
    "en": "YumeLOG's Blog",
    "ja": "YumeLOGのブログ",
    "other": "YumeLOG's Blog"
  }
}
```

---

### 5. 修改首页招呼语

**文件位置：** `/public/data/main/title.yaml`

用于控制主页顶部欢迎语与简短介绍。

```yaml
title:
  - type: "zh"
    content: "天气真好啊，我们去散步吧"
  - type: "en"
    content: "How are you? I am fine."
  - type: "ja"
    content: "元気いいね、何かいいことでもあったのかい？"
  - type: "other"
    content: "Sorry Unknown Language!"
```

---

### 6. 修改照片墙

**文件位置：** `/public/data/config/neko.yaml`

用于管理照片墙展示图片及描述内容（例如猫猫照片或摄影作品）。

```yaml
img:
  - imgError: /cat/猫咪图片1.webp
    img: https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E6%A9%98%E7%8C%AB.webp
    imgName: 猫咪图片1
  - imgError: /cat/猫咪图片2.webp
    img: https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E5%A5%B6%E5%AD%90.webp
    imgName: 猫咪图片2
```

---

### 7. 修改个人详细简介

**文件位置：** `/public/data/config/introduction.yaml`

用于展示完整个人介绍信息。

```yaml
introduction:
  - type: "zh"
    content: |
      这是基础信息，你可以访问 /public/main/introduction.yaml 进行修改
  - type: "en"
    content: |
      This is the basic information.
      You can access /public/main/introduction.yaml to modify it.
  - type: "ja"
    content: |
      これは基本情報(きほんじょうほう)です。
      /public/main/introduction.yaml にアクセスして編集できます。
  - type: "other"
    content: |
      This is the basic information.
      You can access /public/main/introduction.yaml to modify it.
```

---

### 8. 修改纪念日时间线

**文件位置：** `/public/data/config/fromNow.yaml`

用于配置纪念日与时间线展示内容，系统会自动计算时间差。

```yaml
fromNow:
  - time: "19700101"
    photo: ""
    names:
      - type: "zh"
        content: "测试数据"
      - type: "en"
        content: "Test Data"
      - type: "ja"
        content: "テストデータ"
      - type: "other"
        content: "Test Data"

  - time: "20260101"
    photo: ""
    names:
      - type: "zh"
        content: ""
      - type: "en"
        content: ""
      - type: "ja"
        content: ""
      - type: "other"
        content: ""
```

---

## 📜 License

本项目采用 **MIT License** 开源。

你可以自由地：

- 使用
- 修改
- 分发
- 用于商业项目

但必须保留原作者的版权声明。
