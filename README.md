# 🌙 yumeLog (ユメログ)

一个基于 **Vue 3** + **TypeScript** + **Naive UI** + **Vite SSG** 构建的极简高颜值个人主页与博客系统。

本项目为静态网页， 你可以在几乎任何托管平台直接托管，实现低成本部署。
虽然是静态网页，网页是全SEO完备的，不光是`head/meta`信息 每次编译还都会使用`vite-SSG`
将全部页面包括每篇编译时存在的文章的html与sitemap.xml及robots.txt进行预编译以便搜索引擎索引！

本项目拒绝臃肿的富文本与传统 Markdown 引擎，**全手动实现了一套轻量级文本解析器**，并深度集成了 MaiMai
玩家专属成绩展示模块。致力于打造兼具硬核技术与个人美学的专属数字空间。

## 核心特性

### 响应式设计

打破传统博客的刻板布局，全站采用现代化的毛玻璃悬浮 UI。**深度适配移动端（手机/平板）**
，无论是复杂的博客多层嵌套视图，还是首页的多维信息面板，都能在各种屏幕尺寸下保证丝滑的交互体验与像素级的视觉享受。

### 独创的轻量级博客解析引擎

不依赖庞大的第三方渲染库，仅使用 `js-yaml` 获取与结构化数据，核心样式解析完全自研！支持通过独创的 `$$Type()$$` 及 `$$raw-code(编程语言 | title
)% 内容 %end$$` 语法进行快速渲染：

* **支持的嵌套格式指令**: `"bold"`, `"thin"`, `"underline"`, `"strike"`, `"center"`, `"link"`, `"code"`, `"info"`,
  `"warning"`。
* **支持的raw格式指令**: `"info"`,`"warning"`,`"raw-code"`
* **支持显示图片、简介url。图片同样支持双轨数据获取。
* **支持 `"divider"` 分割文本章节。
* **双轨数据获取**: 完美支持从本地目录读取，或通过 HTTP/CDN 从远程服务器动态拉取 YAML 数据流。

### 截图

#### 电脑端

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/1.png" width="170" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/2.png" width="170" />
</p>

#### 手机端

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/3.png" width="170" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/4.png" width="170" />
</p>

#### maimai功能

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/5.png" width="170" />
</p>

#### 纪念日功能

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/6.png" width="170" />
</p>

#### 照片墙功能

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/7.png" width="170" />
</p>

#### blog详情页

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/refs/heads/master/demo/8.png" width="170" />
</p>

### 全方位个人展示模块

不只是博客，更是你在这个世界的数字名片：

* **主题系统**: 支持多种主题，可以设置对应壁纸和主题色
* **多语言适配**: 抛弃繁杂的第三方 i18n 框架，自研基于 JSON/YAML
  的轻量级多语言切换中心。轻松驾驭中文、英语、日本語，甚至是泰语的无缝切换(
  中文、英语、日本語、泰语为内置默认语言，你可以非常轻松的手动添加更多语言的i18n)，让主页真正走向国际化。
* **个人简介**: 高度自定义的个人状态面板。
* **联系网络**: 优雅收纳全域联系方式，涵盖 Telegram, WeChat 等传统社交平台，以及 Ethereum, Solana 等 Web3 钱包地址展示。
* **朋友展示**: 专属友链网格面板，给重要的人留下最显眼的位置。
* **纪念日**: 专属时间线模块，精准计算并展示那些对你意义非凡的时刻。
* **照片展示板**: 专为晒猫或个人摄影打造的流式照片墙。

### 玩家模块

* **Maimai Score**: 原生接入 Maimai DX Aqua 服务器 API，主页直接优雅展示你的铺面战绩与段位信息。

## 技术栈

* **前端框架**: Vue 3 (Composition API)
* **开发语言**: TypeScript (Strict Mode)
* **SEO工具**：Vite SSG
* **组件库**: Naive UI (针对毛玻璃美学与移动端进行了深度样式重写与微调)
* **构建工具**: Vite
* **数据处理**: js-yaml (仅用于解析结构，DOM 渲染由自研 Parser 引擎全权接管)

## 开发与部署

由于项目采用了 **Vite 7** 与 **pnpm** 驱动，请确保你的开发环境已安装 pnpm。

### 1. 环境准备

* **Node.js**: >= 18.0.0
* **Package Manager**: pnpm >= 8.0.0

### 2. 安装依赖

    pnpm install

### 3. 本地开发

启动开发服务器，支持热更新（HMR）：

    pnpm dev

如果你需要在移动端调试（局域网访问），请运行：

    pnpm run host

## 4. 生产环境构建

### 执行以下命令将进行严格的类型检查并生成SEO优化后的静态资源（存放在 dist 目录）：

    vue-tsc --noEmit && vite build && pnpm run ssg

### 如果你并不希望执行Vite-SSG优化，请执行以下命令进行编译（存放在 dist 目录）：

    vite build

### 如果你已经拥有dist，只是希望进行Vite-SSG优化，请执行以下命令进行编译（存放在 dist 目录）：

    vite-ssg build

## 5. 代码质量检查

### 运行 ESLint 自动修复

    pnpm lint

### 运行 TypeScript 类型检查

    pnpm type-check

## 部署说明

### Nginx 配置

本项目使用 vue-router 的 History 模式，部署到 Nginx 时需添加以下配置，否则刷新页面会触发 404：

    server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/yumeLog/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

}

## 块级驱动与自研语法

yumeLog 采用极其灵活的 **块级** 架构组织内容。同时，自研的解析引擎完美支持了**无限嵌套**的文本格式渲染。

**请注意，你必须添加id否则将无法访问文章，你可以直接使用id跳转至文章。**

**例子：你可以直接通过此链接进行快速跳转及分享：**`http://localhost:5173/blog/test`

**请记住link的语法是** `$$link(URL | $$type(点我)$$)$$` ，**其中** `$$type(点我)$$`**其中**
`type`**支持嵌套，但是`URL`**不能嵌套！必须在链接同一层级！**

### 标准 YAML 示例

```yaml
id: "test"
time: "20260106"
pin: true
# pin值以将重要文章置顶
title: "鲲鹏920解决升级至debian12后panic"
blocks:
  # 1. 普通文本块
  - type: "text"
    content: "这是测试文本"
    
  # 2. 极致嵌套文本块
  - type: "text"
    content: |
      $$center($$bold($$underline(这是测试)$$)$$)$$
      $$code(const a = ref(true))$$
      $$info(typescript | const a = ref(true))$$
      $$warning(error | 我去，原地爆炸了！
      爆炸了)$$
      $$warning(error | $$center(我去，原地爆炸了！这个有居中效果喵！
      爆炸了)$$)$$
      $$bold(粗体$$underline(嵌套下划线$$link(http://baidu.com)$$)$$)$$
      $$link(https://baidu.com | $$bold($$underline(点我进入百度)$$)$$)$$
      $$raw-code(yaml | 示例 yaml)
      此内容内所有tag都不会被解析
      # end行必须无空格，单起一行
      %end$$
  - type: "divider"  #分割线
  # 3. 图像渲染块 (支持容灾备用链接)
  - type: "image"
    content:
      - src: /background0.webp
        spareUrl: /background0.webp
        desc: "这是图片描述"

```

由于 **yumeLog 是纯前端静态架构（无后端）**，所有博客与个人信息均通过仓库中的数据文件进行管理。  
如果需要修改内容，请按照以下说明操作。

---

## 添加博客文章

**注意 要使用博客前你必须先在`\public\data\config\yamlUrl.json`** 指向正确的远程目录及热备目录
示例：

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

1. 在博客目录创建新的 YAML 文件（例如 `20260106.yaml`）。
2. 按照项目定义的 `blocks` 结构编写文章内容。
3. **手动修改 `list.json`**，将新的文章文件名添加进去。

### 示例：

```json
[
  "20251201.yaml",
  "20260106.yaml"
]
```

如果没有添加到 `list.json`，文章将不会被系统加载。

---

## I18N 多语言管理

### 语言配置文件：

```
/public/data/config/i18nLang.json
```

默认支持语言：

- 中文
- English
- 日本語

如果不需要某个语言，**直接从 JSON 中删除即可**，对应语言选项会自动从前端消失。
示例：

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

## 修改主题

### 文件位置：

```
/public/data/config/colorData.json
```

**请注意，请必须严格将图片名按照**`background0.xxx`**顺序命名并放入**`/public/`**目录，且每个图片必须有对应主题色，否则将会不工作
**

那么问题来了，主题色怎么获取呢，随便找个取色器咯）））

``` json
{
  "background0": "#C7B0C0",
  "background1": "#9E8A95",
  "background2": "#BF948E",
}

```

---

## 修改网页标题

### 文件位置：

```
/public/data/main/webTitle.json
```

### 标准 JSON 示例

``` json
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

用于控制浏览器标签页标题以及部分全局显示名称。

---

## 修改首页招呼语

### 文件位置：

```
/public/data/main/title.yaml
```

标准 YAML 示例

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

用于控制主页顶部的欢迎语与简短介绍。

---

## 修改照片墙

### 文件位置：

```
/public/data/config/neko.yaml
```

### 标准 YAML 示例

```yaml
img:
  - imgError: /cat/猫咪图片1.webp
    img: https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E6%A9%98%E7%8C%AB.webp
    imgName: 猫咪图片1
  - imgError: /cat/猫咪图片2.webp
    img: https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E5%A5%B6%E5%AD%90.webp
    imgName: 猫咪图片2
```
用于管理照片墙展示的图片及描述内容（例如猫猫照片或摄影作品）。

---

## 修改个人详细简介

### 文件位置：

```
/public/data/config/introduction.yaml
```

### 标准 YAML 示例

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

用于展示完整的个人介绍信息。

---

## 修改纪念日时间线

### 文件位置：

```
/public/data/config/fromNow.yaml
```

### 标准 YAML 示例

```yaml
introduction:
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
        content: "如果你需要添加纪念日请进入/src/data/components/fromNow.json"
      - type: "en"
        content: "To add anniversaries, please access /src/data/components/fromNow.json"
      - type: "ja"
        content: "記念日の追加が必要な際は、/src/data/components/fromNow.json を開いて設定してください。"
      - type: "other"
        content: "To add anniversaries, please access /src/data/components/fromNow.json"
```

用于配置纪念日与时间线展示内容。

---

## License

本项目采用 **MIT License** 开源。

你可以自由地：

- 使用
- 修改
- 分发
- 用于商业项目

但必须保留原作者的版权声明。
