# 🌙 yumeLog (ユメログ)

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue%203-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
</p>

一个基于 **Vue 3** + **TypeScript** + **Naive UI** + **Vite SSG** 构建的极简高颜值个人主页与自制 **RICH-TEXT-DSL** 博客系统。

本项目为静态网页，可实现极低成本部署。通过 `vite-SSG` 预渲染技术，在每次编译时自动生成包含所有文章的 HTML、`sitemap.xml` 与 `robots.txt`，完美实现全站级 SEO 优化，搜索引擎与各大社交软件分享抓取毫无压力。

致力于打造兼具硬核技术与个人美学的专属数字空间。

---

## 🌟 特性速览 (Features Overview)

| Feature | Description |
| :--- | :--- |
| **Static Architecture** | 纯静态博客架构，极低成本无后端部署 |
| **Vite SSG** | 自动预渲染 HTML / sitemap / robots，SEO 完备 |
| **Custom DSL** | 拒绝传统臃肿 Markdown，自研轻量级 RICH-TEXT DSL |
| **Nested Rendering** | 核心引擎支持无限嵌套语法解析 |
| **Image Blocks** | 图像块完美支持主干与双轨容灾备用地址 |
| **Responsive UI** | 全端响应式设计，深度适配移动端与毛玻璃交互 |
| **Theme System** | 灵活的主题系统：背景壁纸 + 对应主题色 |
| **Multi Language** | 抛弃繁重框架，自研基于 JSON/YAML 的轻量级 i18n |
| **Anniversary Timeline** | 专属纪念日时间轴，精准计算非凡时刻 |
| **Photo Wall** | 专为晒猫与个人摄影打造的流式照片墙展示 |
| **Social Links** | 全域联系方式收纳，支持 Web3 钱包地址展示 |
| **Remote Data** | 灵活的数据双轨：完美支持从本地、CDN 或 HTTP 动态拉取 YAML |
| **Maimai Module** | MaiMai DX 原生 API 接入，优雅展示玩家成绩与段位 |

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
- **UI & 样式**: Naive UI (针对毛玻璃美学与移动端微调)
- **构建 & SEO**: Vite 7 / Vite SSG
- **数据处理**: `js-yaml` (仅用于解析结构，DOM 渲染由自研 Parser 全权接管)
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

## ✍️ 自研 DSL 语法指南 (DSL Grammar)

yumeLog 采用块级架构与自研 DSL 引擎渲染博客文本。文章必须包含唯一 `id` 以便路由访问。

### 基础语法
```text
$$type(content)$$
```
**示例：** `$$bold(Hello World)$$`

### 嵌套语法
所有常规 type 均支持无限嵌套。
**示例：** `$$bold($$underline(Hello)$$)$$`

### 超链接语法 (Link)
```text
$$link(URL | content)$$
```
**示例：** `$$link(https://example.com | 点我访问)$$`

⚠️ **严格注意：**
- **URL**：绝对 **不能嵌套**！必须在第一层级声明。
- **content**：**可以嵌套** 其他指令。
**正确复合示例：** `$$link(https://google.com | $$bold(Google)$$)$$`

### 原始代码块 (Raw Code Block)
Raw block 内部 **不会解析任何 DSL 指令**。
```text
$$raw-code(lang | title)%
content
%end$$
```
**示例：**
```text
$$raw-code(ts | example)%
const a = 1
%end$$
```

### 支持的 Type 清单

| Type | Description |
| :--- | :--- |
| **bold** | 粗体 |
| **thin** | 细体 |
| **underline** | 下划线 |
| **strike** | 删除线 |
| **center** | 居中对齐 |
| **code** | 行内代码 |
| **link** | 超链接 |
| **info** | 基础信息提示框 |
| **warning** | 警告提示框 |

### 完整 YAML 块级驱动示例
```yaml
id: "test"
time: "20260106"
pin: true
title: "DSL 渲染测试"
blocks:
  - type: "text"
    content: |
      $$center($$bold($$underline(多层嵌套测试)$$)$$)$$
      $$info(typescript | const a = ref(true))$$
      $$warning(error | 发生未知错误！)$$
      $$link([https://baidu.com](https://baidu.com) | $$bold(点我进入百度)$$)$$
      $$raw-code(yaml | 示例)%
      纯净文本，忽略所有 $$tag()$$
      %end$$
  - type: "divider"
  - type: "image"
    content:
      - src: /background0.webp
        spareUrl: /background0.webp
        desc: "绝美风景"
```

---

## ⚙️ 核心配置与自定义指南

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
    img: [https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E6%A9%98%E7%8C%AB.webp](https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E6%A9%98%E7%8C%AB.webp)
    imgName: 猫咪图片1
  - imgError: /cat/猫咪图片2.webp
    img: [https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E5%A5%B6%E5%AD%90.webp](https://raw.githubusercontent.com/chiba233/newMainpage/master/public/cat/%E5%A5%B6%E5%AD%90.webp)
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
