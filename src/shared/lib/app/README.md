# App Core Library (`src/shared/lib/app`)

该目录包含了整个应用的核心运行时逻辑，涵盖了状态管理、国际化（i18n）、主题切换、SEO 控制以及路由模态框管理。

---

## 1. 模块权责说明 (Per-File Responsibilities)

### 状态与数据管理

- **`useGlobalState.ts`**: **全局状态中心**。定义并导出所有跨组件共享的 Ref/Computed（如文章列表、弹窗开关）。负责文章正文的异步解析调度。
- **`contentStore.ts`**: **内容存储器**。处理数据的预加载逻辑，确保在进入页面前关键数据已就绪。
- **`publicData.ts`**: **公共资源加载器**。兼容 SSR (Node.js fs) 和浏览器 (fetch) 的资源读取工具，用于加载 `/public`
  目录下的文本和 JSON。
- **`setupJson.ts`**: **配置初始化**。定义社交链接、个人信息等静态或半动态配置的初始结构和响应式引用。
- **`mainContentResources.ts`**: **资源映射表**。集中定义 DSL 文件的名称、路径和类型。

### 国际化 (i18n)

- **`langCore.ts`**: **i18n 核心逻辑**。纯函数集，处理时间格式化、多语言回退策略和首选语言计算。
- **`setupLang.ts`**: **语言副作用管理**。负责将语言设置同步到 `localStorage`，并导出全局感知的格式化工具。
- **`useYamlI18n.ts`**: **YAML 多语言适配**。专门为来自 YAML/DSL 的动态内容提供多语言属性提取逻辑。

### UI 与交互

- **`useTheme.ts`**: **主题引擎**。负责 HEX 颜色到 CSS 变量的转换计算，以及 `:root` 样式的实时同步。
- **`animationCalculate.ts`**: **动画辅助**。提供滚动位置计算、视差或补间动画所需的数学逻辑。
- **`msgUtils.ts`**: **消息通知工具**。封装了 Naive UI 的全局 `message` 调用，使其可以在非组件环境下使用。

### 路由与 SEO

- **`useRouteModal.ts`**: **路由状态同步**。负责监听 URL 变化并自动打开/关闭对应的博客文章模态框。
- **`useHead.ts`**: **SEO 指令集**。基于 `@unhead/vue` 定义各个页面的 Meta、JSON-LD 和 Title 生成规则。
- **`siteOrigin.ts`**: **域名解析**。统一处理不同环境下的 Site Origin，确保绝对 URL 的正确性。
- **`postSlug.ts`**: **路径生成器**。定义文章标题到 URL Slug 的转换规则。

---

## 2. 核心函数与调试建议

### 2.1 语言切换无效？

- **检查位置**: `setupLang.ts` 中的 `watch(langMap, ...)`。
- **Log 点**: 观察 `resolvePreferredLang` 的输入，确认 `langMap` 是否已加载。

### 2.2 主题色显示异常？

- **检查位置**: `useTheme.ts` 的 `themeMetrics` 计算属性。
- **Log 点**: 检查输入的 `themeColor` 是否为合法 Hex，观察计算出的 `luma` 值是否符合预期。

### 2.3 博客文章打不开或 Slug 匹配失败？

- **检查位置**: `useRouteModal.ts` 中的 `syncRouteToModal`。
- **Log 内容**: `console.log('Syncing Route:', route.path, 'Slug:', slug);`

### 2.4 SEO 预览不更新？

- **检查位置**: `useHead.ts`。
- **注意**: 由于使用了 `@unhead/vue`，Head 信息是响应式的。检查 `postContext` 计算属性是否在文章切换时正确更新。

---

## 3. 设计决策

- **SSR 兼容性**: 在 `publicData.ts` 和 `siteOrigin.ts` 中通过 `import.meta.env.SSR` 区分服务端和客户端逻辑。
- **解耦设计**: `langCore.ts` 不依赖任何 Vue API，方便在纯 JS 环境中测试。
- **性能优化**: `useGlobalState` 中使用了分片解析长文章，避免主线程阻塞。
