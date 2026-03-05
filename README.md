# 🌙 yumeLog (ユメログ)

一个基于 **Vue 3** + **TypeScript** + **Naive UI** 构建的极简高颜值个人主页与博客系统。

本项目拒绝臃肿的富文本与传统 Markdown 引擎，**全手动实现了一套轻量级文本解析器**，并深度集成了 MaiMai
玩家专属成绩展示模块。致力于打造兼具硬核技术与个人美学的专属数字空间。

## 核心特性

### 响应式设计

打破传统博客的刻板布局，全站采用现代化的毛玻璃悬浮 UI。**深度适配移动端（手机/平板）**
，无论是复杂的博客多层嵌套视图，还是首页的多维信息面板，都能在各种屏幕尺寸下保证丝滑的交互体验与像素级的视觉享受。

### 独创的轻量级博客解析引擎

不依赖庞大的第三方渲染库，仅使用 `js-yaml` 获取与结构化数据，核心样式解析完全自研！支持通过独创的 `$$Type()$$` 语法进行快速渲染：

* **支持的格式指令**: `"bold"`, `"thin"`, `"underline"`, `"strike"`, `"center"`, `"link"`。
* **双轨数据获取**: 完美支持从本地目录读取，或通过 HTTP/CDN 从远程服务器动态拉取 YAML 数据流。

<p align="center">
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/blob/master/demo/1.png" width="600" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/blob/master/demo/1.png" width="600" />
  <img src="https://raw.githubusercontent.com/chiba233/YumeLog/blob/master/demo/1.png" width="600" />
</p>

### 全方位个人展示模块

不只是博客，更是你在这个世界的数字名片：

* **多语言适配**: 抛弃繁杂的第三方 i18n 框架，自研基于 JSON/YAML
  的轻量级多语言切换中心。轻松驾驭中文、英语、日本語，甚至是泰语的无缝切换，让主页真正走向国际化。
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
* **组件库**: Naive UI (针对毛玻璃美学与移动端进行了深度样式重写与微调)
* **构建工具**: Vite
* **数据处理**: js-yaml (仅用于解析结构，DOM 渲染由自研 Parser 引擎全权接管)

## 块级驱动与自研语法

yumeLog 采用极其灵活的 **块级** 架构组织内容。同时，自研的解析引擎完美支持了**无限嵌套**的文本格式渲染。

### 标准 YAML 示例

```yaml
layout: "common"
time: "20260106"
title: "鲲鹏920解决升级至debian12后panic"
blocks:
  # 1. 普通文本块
  - type: "text"
    content: "这是测试文本"
    
  # 2. 极致嵌套文本块
  - type: "text"
    content: |
      $$center($$bold($$underline(这是测试)$$)$$)$$
      $$bold(粗体$$underline(嵌套下划线$$link(http://baidu.com)$$)$$)$$
      
  # 3. 图像渲染块 (支持容灾备用链接)
  - type: "image"
    content:
      - src: /background0.webp
        spareUrl: /background0.webp
        desc: "这是图片描述"