# 🌙 yumeLog (ユメログ)

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue%203-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
</p>

一个基于 **Vue 3** + **TypeScript** + **Naive UI** + **Vite SSG** 构建的好看的个人主页与自制 **RICH-TEXT-DSL** 博客系统。

本项目为静态网页，可实现极低成本部署。通过 `vite-SSG` 预渲染技术，在每次编译时自动生成包含所有文章的 HTML、`sitemap.xml` 与
`robots.txt`，完美实现全站级 SEO 优化，搜索引擎与各大社交软件分享抓取毫无压力。

---

## 🌟 特性速览 (Features Overview)

| Feature                  | Description                          |
|:-------------------------|:-------------------------------------|
| **Static Architecture**  | 纯静态博客架构，极低成本无后端部署                    |
| **Vite SSG**             | 自动预渲染 HTML / sitemap / robots，SEO 完备 |
| **Custom DSL**           | 拒绝传统臃肿 Markdown，自造轻量级 RICH-TEXT DSL  |
| **Nested Rendering**     | 核心引擎支持无限嵌套语法解析                       |
| **Image Blocks**         | 图像块完美支持主干与双轨容灾备用地址                   |
| **Responsive UI**        | 全端响应式设计，深度适配移动端与毛玻璃交互                |
| **Theme System**         | 灵活的主题系统：背景壁纸 + 对应全场景覆盖主题色。           |
| **Multi Language**       | 抛弃繁重框架，自制轻量级 i18n                    |
| **Anniversary Timeline** | 专属纪念日时间轴                             |
| **Photo Wall**           | 专为晒猫与个人的照片墙展示                        |
| **Social Links**         | 全域联系方式收纳，支持 Web3 钱包地址展示              |
| **Remote Data**          | 灵活的数据双轨：完美支持从本地、CDN 或 HTTP 动态拉取 YAML |
| **Maimai Module**        | MaiMai DX AQUA API 接入                |

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

- **框架 & 语言**: Vue 3 (Composition API) / TypeScript (Strict Mode)
- **UI & 样式**: Naive UI (针对毛玻璃美学与移动端魔改)
- **构建 & SEO**: Vite 7 / Vite SSG
- **数据处理**: `js-yaml` (仅用于解析非富文本内容，自制递归DSL语法不是很适配yaml所以用了特殊替代，DOM 渲染由自研 Parser
  全权接管)
- **依赖管理**: `pnpm` (>= 10.0.0), Node.js (>= 24.0.0)

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
# 方案 A：完整构建 (严格类型检查 + SSG SEO 优化) —— 推荐
vue-tsc --noEmit && vite build && pnpm run ssg

# 方案 B：仅基础构建 (不执行 SSG)
vite build

# 方案 C：对已有的 dist 目录进行 SSG 补全
vite-ssg build
```

### 3. 代码质量检查

```bash
pnpm lint
pnpm type-check
```

### 4. 部署 Nginx 配置参考

项目采用 Vue-router History 模式，部署到 Nginx 时需添加以下配置避免 404：

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

## 自研 DSL 语法指南 (DSL Grammar)

yumeLog 采用块级架构与自研 DSL 引擎渲染博客文本。文章可以指定 `id` 以便路由访问，也可以直接使用 `文章标题`
作为页面链接，但是这两个你肯定必须写一个。

## DSL 容错策略 (Error Tolerance)

yumeLog 的 DSL 采用 **宽容解析策略 (Permissive Parsing)**。

设计原则：

> 解析器会尽量渲染内容，而不是因为语法错误直接中断解析。

这意味着即使 DSL 写法不完全合法，系统仍然会尝试生成可用的输出，并在web输出警告信息。

### 行为规则

解析器遇到异常时会按以下优先级处理：

1. **尽量保持文本可读**
2. **保留原始内容**
3. **输出错误日志**

---

### 非法 Tag

如果 DSL 类型未注册，例如：

```text
$$something(hello world)$$
```

解析器不会抛出致命错误，而是：

- 在web输出 warning
- 将该内容作为普通文本渲染

最终页面仍然可以正常显示。

---

### 结构错误

如果 DSL 嵌套结构不完整，例如：

```text
$$bold(hello
```

解析器会停止当前 DSL 解析，并将剩余部分当作普通文本处理直到下一个闭合标签。

---

### 参数异常

如果参数数量异常：

- **不足参数** → 自动 fallback  
- **多余参数** → 合并到最后一个参数

例如：

```text
$$info(title | text | extra)$$
```

最终解析为：

title = "title"  
text = "textextra"

---

### RAW Block 异常

RAW Block 如果未正确闭合：

```text
$$raw-code(js)%
console.log("hello")
```

解析器会把整个 RAW block 当作普通文本输出，并记录错误日志。

---

### 为什么采用宽容解析

DSL 的主要目标是 **博客写作体验**，而不是严格编程语言。

因此：

- 用户不需要担心小语法错误
- 页面不会因为 DSL 失误而完全崩溃
- 内容始终保持可读

这种设计与 HTML、Markdown 的容错理念类似。

### DSL 解析流程 (Parsing Pipeline)

yumeLog 的富文本系统不是简单字符串替换，而是一个递归解析引擎。  
DSL 文本会被转换为一棵 **Rich-Text AST（抽象语法树）**，再渲染为 Vue 组件。

解析流程如下：

Raw Text

   │
   ▼
   
Tokenizer

(识别 `$$type(...)$$` 结构)

   │
   ▼
   
AST Builder

(递归解析嵌套 DSL)

   │
   ▼
   
Argument Parser

(解析 | 参数系统)

   │
   ▼
   
Renderer

(转换为 Vue 渲染结构)

   │
   ▼
   
HTML Output

1 Tokenizer

扫描文本并识别 DSL 指令，例如：

`$$bold(Hello)$$`

会被识别为：

type: bold  
content: Hello

普通文本会作为 Text Token 保留。

2 AST 构建  

解析器会递归解析嵌套 DSL，例如：

`$$bold($$underline(Hello)$$)$$`

解析结构：

bold  
 └ underline  
     └ Hello  

因此 DSL 可以无限嵌套。

3 参数解析  

DSL 支持使用 `|` 传递多个参数，例如：

`$$link(url | text)$$`

解析为：

`[url, text]`

注意：  

`|` 只会在 **纯文本 token** 中被识别，因此不会破坏嵌套结构。

4 渲染阶段  

最终 AST 会交给对应的渲染器，将 DSL 节点转换为 Vue 渲染结构，例如：

bold → `<b>` 
link → `<a>`  
info → InfoBox 组件  

最终输出为 HTML。

### 基础语法

```text
$$type(content)$$
```

**示例：** `$$bold(Hello World)$$`

### 嵌套语法

所有常规 type 均支持无限嵌套。
**示例：** `$$bold($$underline(Hello)$$)$$`

### 接语法

```text
$$link(URL | content)$$
$$info(我去，这怎么是title | 哇哦我是正文欸)$$
```

**示例：** `$$link(https://example.com | 点我访问)$$`

⚠️ **严格注意：**

- **URL**：绝对 **不能嵌套**！必须在第一层级声明。
- **content**：**可以嵌套** 其他指令。
- **正确复合示例：** `$$link(https://google.com | $$bold(Google)$$)$$`
- **注意:** 如果你传了`$$info(我去，这怎么是title | 哇哦我是正文欸 | 欸我又跳出来了 | 欸我又进去了)$$`
  因为info只会接受title和正文，所以正文最终会显示为 "哇哦我是正文欸欸我又跳出来了欸我又进去了"。

### 原始代码块 (Raw Code Block)

Raw block 内部 **不会解析任何 DSL 指令**。

- 理论上所有基础语法都可以支持RAW，但是做是一回事想是一回事，我只是给一些你们可能真的会用得到的加了RAW Support。

```text
$$raw-code(lang | title)%
content
%end$$

$$info(你好，我是标题)%
content
 %end$$ #因为缩进多了一个空格所以这个不会被认为是合法的end tag
%end$$
#endTag这一行不能有空格不能有任何其他东西，任何东西都会被认为是不合法闭合
```

**示例：**

```text
$$raw-code(ts | example)%
const a = 1
%end$$
```

- **注意:** RAW BLOCK为了防止意外闭合

### 支持的 Type 清单

| Type          | Description | 是否支持Raw语法 | 是否支持嵌套语法 | 可以传入的参数                            |
|:--------------|:------------|:----------|:---------|:-----------------------------------|
| **bold**      | 粗体          | no        | yes      | `(text)`                           |
| **thin**      | 细体          | no        | yes      | `(text)`                           |
| **underline** | 下划线         | no        | yes      | `(text)`                           |
| **strike**    | 删除线         | no        | yes      | `(text)`                           |
| **center**    | 居中对齐        | no        | yes      | `(text)`                           |
| **code**      | 行内代码        | no        | yes      | `(text)`                           |
| **link**      | 超链接         | no        | yes      | `(URL \| text)`                    |
| **info**      | 基础信息提示框     | yes       | yes      | `(title \| text)` or  `(title)%正文` |
| **warning**   | 警告提示框       | yes       | yes      | `(title \| text)` or  `(title)%正文` |
| **raw-code**  | 行内代码        | yes       | no       | `(code-lang \| code-title)%正文`     |

## 参数解析与 Fallback 规则

DSL 在解析时会执行 **参数拆分与容错处理**。  
为了保证 DSL 在各种输入情况下都能稳定运行，解析器定义了一套明确的 fallback 规则。

---

### 1 单参数 DSL

当 DSL 只定义 **一个参数** 时：

```text
$$bold(text)$$
```

如果用户写：

```text
$$bold(hello world)$$
```

解析器会把整个内容视为一个参数：

```text
text = "hello world"
```

不会进行任何拆分。

---

### 2 多参数 DSL

当 DSL 定义多个参数时，使用 `|` 分隔：

```text
$$link(url | text)$$
```

示例：

```text
$$link(https://google.com | Google)$$
```

解析结果：

```text
url = "https://google.com"
text = "Google"
```

---

### 3 参数数量不足

当 DSL 需要多个参数，但只提供 **一个参数** 时，解析器会执行 fallback。

例如：

```text
$$link(https://google.com)$$
```

解析器行为：

```text
url = "https://google.com"
text = "https://google.com"
```

即：

text 会 fallback 为 url。

最终渲染效果：

```html
<a href="https://google.com">https://google.com</a>
```

---

### 4 参数数量过多

当参数数量 **超过 DSL 定义数量** 时：

额外参数会被 **合并到最后一个参数**。

示例：

```text
$$info(title | text | extra | more)$$
```

解析结果：

```text
title = "title"
text = "textextramore"
```

解析器只会保留：

```text
(title, text)
```

---

### 5 `|` 分隔符解析规则

`|` 只会在 **纯文本 token** 中被识别。

这意味着：

```text
$$link(url | $$bold(hello | world)$$)$$
```

内部的 `|` **不会影响外层参数解析**。

解析器只会拆分：

```text
url
$$bold(hello | world)$$
```

---

### 6 空参数处理

如果参数为空：

```text
$$info(|hello)$$
```

解析结果：

```text
title = ""
text = "hello"
```

是否允许空值取决于 DSL 类型本身。

---

### 7 未注册 DSL 类型

如果解析器遇到未注册 DSL：

```text
$$something(hello world)$$
```

解析器会执行 fallback：

整个 DSL 会被当作普通文本输出：

```text
$$something(hello world)$$
```

不会进行任何渲染。

这样可以避免解析器崩溃。

---

### 8 RAW BLOCK 特殊规则

RAW BLOCK 内部 **不会解析任何 DSL 指令**。

示例：

```text
$$raw-code(ts)%
$$bold(this will not parse)$$
%end$$
```

输出内容：

```text
$$bold(this will not parse)$$
```

RAW 只会检测：

```text
%end$$
```

作为闭合标记。

并且：

- `%end$$` **必须独占一行**
- 不能有空格
- 不能有任何额外字符

否则 RAW block 不会被认为是合法闭合。

---

### 9 URL 参数限制

对于 `link` 这样的 DSL：

```text
$$link(url | text)$$
```

URL **必须是纯文本 token**，不能嵌套 DSL。

正确写法：

```text
$$link(https://google.com | $$bold(Google)$$)$$
```

错误写法：

```text
$$link($$bold(https://google.com)$$ | Google)$$
```

URL 位置必须保持为纯文本，否则行为未定义。

### 🏗️ 块级架构语法指南 (Block-level Syntax)

yumeLog 采用自研的 **块驱动架构 (Block-driven Architecture)**。文章由多个独立的 `@type` 块组成，这种设计让静态页面也能拥有极强的组件化能力和解析效率。

#### 1. 基础结构 (Base Structure)

每个块必须以 `@` 符号开始，并以 `@end` 独立占行闭合。

#### 2. 标准块清单 (Available Blocks)

| 块指令 (@type)  | 角色定位      | 内部语法要求                          |  是否必选   |
|:-------------|:----------|:--------------------------------|:-------:|
| **@meta**    | **文章元数据** | **YAML** (定义 id, title, time 等) | **YES** |
| **@text**    | **富文本正文** | **DSL** + 纯文本 (支持嵌套)            |   NO    |
| **@divider** | **逻辑分割线** | (留空即可)                          |   NO    |
| **@image**   | **多轨媒体块** | **YAML List** (支持容灾链接)          |   NO    |

#### 文章元信息 (`@meta`)

每篇文章**必须**以 `@meta` 开头，用于驱动 SEO、路由映射及页面布局。

```text
@meta
layout: common        # 布局模板
time: 20260316        # 日期 (YYYYMMDD)
lang: zh              # 语言 (zh/en/ja等)
id: bangkok-life      # 唯一 ID (用于路由访问)
pin: true             # 是否置顶
title: 曼谷的午后喵     # 文章标题
@end
```

#### 跳过匹配规则 (`stripQuotes`)

你可以用 `\@end`来进行跳过匹配，同样在`value`内`"It\\\'s \"Mīkè\"\\"`可以被保护为`It\'s "Mīkè"\`
请注意这是完全缩进语言，所以 `- `为创建一个object组, `  `两个空格为为上一个object组添加对象，`    `四个空格为多行元素缩进。

```text
@text
\@end
@end

@image
- desc: "I \"love\" Bangkok" //输出为I "love" Bangkok
- desc: |
    这是多行支持
    123
- desc: 请注意这是完全缩进语言
```

#### 富文本容器 (@text)

渲染引擎的核心。内部支持所有 `dsl` 指令，负责承载主要的文字内容。

```text
@text
这是一段普通的文字。
$$center($$bold(这是居中且加粗的文字喵！))$$
@end
```

#### 容灾图像块 (@image)

专为图片高可用设计，支持定义主地址与热备地址。

```text
@image
- src: /images/main.webp
  spareUrl: [https://cdn.example.com/backup.webp](https://cdn.example.com/backup.webp)
  desc: 三花猫 Mīkè 的日常
@end
```

#### 视觉分割线 (@divider)

```text
@divider
@end
```
---

## 核心配置与自定义指南

由于 **yumeLog 是纯前端静态架构（无后端）**，所有数据均通过仓库中的本地文件或远程 JSON/YAML 驱动。如果需要修改内容，请严格按照以下说明操作。

### 1. 添加博客文章

**注意：** 要使用博客前你必须先在 `\public\data\config\yamlUrl.json` 指向正确的远程目录及热备目录。

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

**操作步骤：**

1. 在博客目录创建新的 YAML 文件（例如 `20260106.yaml`）。
2. 按照项目定义的 `blocks` 结构编写文章内容。
3. **手动修改 `list.json`**，将新的文章文件名添加进去。如果没有添加，文章将不会被系统加载。

```json
[
  "20251201.yaml",
  "20260106.yaml"
]
```

### 2. I18N 多语言管理

**文件位置：** `/public/data/config/i18nLang.json`
默认支持中文、English、日本語。如果不需要某个语言，**直接从 JSON 中删除即可**，对应选项会自动从前端消失。

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

### 3. 修改主题

**文件位置：** `/public/data/config/colorData.json`
**强制要求：** 图片必须严格按照 `background0.xxx` 顺序命名并放入 `/public/` 目录，且每个图片必须有对应主题色，否则将无法工作。

```json
{
  "background0": "#C7B0C0",
  "background1": "#9E8A95",
  "background2": "#BF948E"
}
```

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

### 5. 修改首页招呼语

**文件位置：** `/public/data/main/title.yaml`
用于控制主页顶部的欢迎语与简短介绍。

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

### 6. 修改照片墙

**文件位置：** `/public/data/config/neko.yaml`
用于管理照片墙展示的图片及描述内容（例如猫猫照片或摄影作品）。

```yaml
img:
  - imgError: /cat/猫咪图片1.webp
    img: [ https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E6%A9%98%E7%8C%AB.webp ](https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E6%A9%98%E7%8C%AB.webp)
    imgName: 猫咪图片1
  - imgError: /cat/猫咪图片2.webp
    img: [ https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E5%A5%B6%E5%AD%90.webp ](https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E5%A5%B6%E5%AD%90.webp)
    imgName: 猫咪图片2
```

### 7. 修改个人详细简介

**文件位置：** `/public/data/config/introduction.yaml`
用于展示完整的个人介绍信息。

```yaml
introduction:
  - type: "zh"
    content: |
      这是基础信息，你可以访问/main/introduction.yaml进行修改
  - type: "en"
    content: |
      This is the basic information. 
      You can access /main/introduction.yaml to modify it.
  - type: "ja"
    content: |
      これは基本情報(きほんじょうほう)です。
      /main/introduction.yaml にアクセスして編集(へんしゅう)できます。
  - type: "other"
    content: |
      This is the basic information. 
      You can access /main/introduction.yaml to modify it.
```

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
