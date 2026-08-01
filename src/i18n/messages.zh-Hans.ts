import type { SupportedLocale } from "./locales.js";
import type { MessageCatalog } from "./messages.en.js";

export const messages: MessageCatalog = {
  // Brand
  "brand.name": "Wikitext Formatter",
  "brand.tagline": "安全、本地的 MediaWiki 源代码格式化",

  // Language selector
  "language.label": "语言",
  "language.follow-browser": "跟随浏览器",
  "language.en": "English",
  "language.zh-Hans": "简体中文",
  "language.zh-Hant": "繁體中文",

  // Theme selector
  "theme.label": "主题",
  "theme.system": "跟随系统",
  "theme.light": "浅色",
  "theme.dark": "深色",

  // Header links
  "header.core": "核心",
  "header.frontend": "前端",

  // Initialization screen
  "init.initializing": "正在初始化本地格式化器 Worker……",
  "init.retry-worker": "重试 Worker",

  // Toolbar
  "toolbar.aria-label": "格式化器操作",
  "toolbar.format": "格式化",
  "toolbar.stop": "停止",
  "toolbar.copy-output": "复制结果",
  "toolbar.download": "下载",
  "toolbar.open-file": "打开文件",
  "toolbar.clear": "清空",
  "toolbar.load-example": "加载示例",
  "toolbar.settings": "设置",
  "toolbar.diff": "差异",

  // Source editor
  "editor.source.label": "源文本",
  "editor.source.muted": "Wikitext",
  "editor.output.label": "格式化结果",
  "editor.output.muted": "只读",
  "editor.stats.aria": "{lines} 行，{characters} 个字符",
  "editor.stats.visible": "{lines} 行 · {characters} 个字符",

  // EditorPane misc
  "editor.file-not-readable": "所选文件在此浏览器中无法读取。",
  "editor.large-file-warning":
    "这是一个非常大的文件，格式化可能需要更长时间；你可以随时停止 Worker。",

  // Diff view
  "diff.title": "源文本与格式化结果差异",
  "diff.side-by-side": "并排视图",
  "diff.unified": "统一视图",
  "diff.original.aria": "原始 Wikitext",
  "diff.formatted.aria": "格式化后的 Wikitext",
  "diff.unified.aria": "统一的 Wikitext 差异",
  "diff.loading": "正在加载差异工具……",

  // Status bar
  "status.ready": "就绪",
  "status.formatting": "正在格式化……",
  "status.changed": "已格式化，有更改",
  "status.unchanged": "已完成格式化",
  "status.fail-closed": "安全中止",
  "status.unexpected-error": "意外错误",
  "status.profile": "配置文件",
  "status.versions": "Web {web} · 格式化器 {fmt}",

  // Privacy
  "privacy.notice": "格式化在您的浏览器中本地运行。您的 Wikitext 不会被上传。",

  // Diagnostics
  "diagnostics.title": "诊断",
  "diagnostics.entries": "{count} 条规则条目",
  "diagnostics.empty": "最近一次结果没有失败、警告或规则诊断。",
  "diagnostics.table.rule": "规则",
  "diagnostics.table.severity": "严重性",
  "diagnostics.table.message": "消息",
  "diagnostics.severity.warning": "警告",
  "diagnostics.severity.info": "信息",
  "diagnostics.stage": "阶段",
  "diagnostics.aria": "诊断详细信息",
  "layout.status-diagnostics": "格式化状态和诊断",

  // Settings panel
  "settings.title": "格式化器设置",
  "settings.close": "关闭设置",
  "settings.general": "常规",
  "settings.profile": "配置文件",
  "settings.profile.default": "默认",
  "settings.profile.production": "生产",
  "settings.profile.aggressive": "激进",
  "settings.line-width": "行宽",
  "settings.formatting-level": "格式化级别",
  "settings.level.safe": "安全",
  "settings.level.normal": "标准",
  "settings.level.experimental": "实验",
  "settings.wrap-lines": "自动换行",
  "settings.templates": "模板",
  "settings.format-templates": "格式化模板",
  "settings.inline-spacing": "内联间距",
  "settings.inline-spacing.auto": "自动",
  "settings.inline-spacing.compact": "紧凑",
  "settings.inline-spacing.spaced": "分散",
  "settings.parameter-layout": "参数布局",
  "settings.parameter-layout.compact": "紧凑",
  "settings.parameter-layout.flush": "齐平",
  "settings.parameter-layout.indented": "缩进",
  "settings.format-template-params": "格式化模板参数（实验性）",
  "settings.tables": "表格",
  "settings.format-tables": "格式化表格",
  "settings.cell-separator": "单元格分隔符",
  "settings.cell-separator.auto": "自动",
  "settings.cell-separator.split": "拆分",
  "settings.cell-separator.preserve": "保留",
  "settings.structure": "结构",
  "settings.headings": "标题",
  "settings.lists": "列表",
  "settings.section-spacing": "章节间距",
  "settings.normalize-blank-lines": "规范化空白行",
  "settings.html-void-tags": "HTML 空元素标签",
  "settings.html-void-tags.html5": "HTML5",
  "settings.html-void-tags.xhtml": "XHTML",
  "settings.html-void-tags.preserve": "保留",
  "settings.links-metadata": "链接和元数据",
  "settings.categories": "分类",
  "settings.file-links": "文件链接",
  "settings.wikilinks": "内部链接",
  "settings.external-links": "外部链接",
  "settings.references": "引用",
  "settings.redirects": "重定向",
  "settings.behavior-switches": "行为开关",
  "settings.interlanguage-links": "跨语言链接",
  "settings.interlanguage-placement": "跨语言链接位置",
  "settings.interlanguage-placement.preserve": "保留",
  "settings.interlanguage-placement.footer": "页脚",
  "settings.behavior-switch-placement": "行为开关位置",
  "settings.behavior-switch-placement.preserve": "保留",
  "settings.behavior-switch-placement.footer": "页脚",
  "settings.interlanguage-prefixes": "跨语言前缀",
  "settings.parser-config": "解析器配置",
  "settings.parser-config.value": "MediaWiki 捆绑的浏览器配置",
  "settings.restore-core-defaults": "恢复核心默认值",
  "settings.reset-settings": "重置设置",

  // Formatter status
  "status.worker-not-ready": "格式化器 Worker 尚未就绪。",
  "status.source-changed":
    "源文本在格式化期间已更改，较早的结果已被丢弃；请重新格式化以更新输出。",
  "status.formatting-stopped": "格式化已停止。格式化器 Worker 已重启。",

  // Clipboard and copy
  "copy.success": "格式化结果已复制到剪贴板。",
  "copy.denied": "剪贴板访问被拒绝。请手动选择并复制输出。",

  // Result summary — generated by summarizeRuleDiagnostics
  "summary.templates-changed": "已格式化 {count} 个模板。",
  "summary.templates-skipped": "已跳过 {count} 个不明确的模板。",
  "summary.tables-changed": "已格式化 {count} 个表格。",
  "summary.tables-skipped": "已跳过 {count} 个不明确的表格。",
  "summary.lists-changed": "已格式化 {count} 个列表行。",
  "summary.categories-moved": "已移动 {count} 个分类。",
  "summary.redirects-formatted": "已格式化重定向指令。",
  "summary.file-links-formatted": "已格式化 {count} 个文件链接。",
  "summary.wikilinks-formatted": "已格式化 {count} 个内部链接。",
  "summary.external-links-formatted": "已格式化 {count} 个外部链接。",
  "summary.references-formatted": "已格式化 {count} 个引用。",
  "summary.section-spacing-normalized": "已规范化章节标题周围的间距。",
  "summary.equivalence-failed": "{structure} 等价性未得到验证。",

  // Document title and meta
  "document.title.default": "Wikitext Formatter",
  "document.title.example": "示例 — Wikitext Formatter",
  "meta.description":
    "基于浏览器的 MediaWiki Wikitext 格式化工具。格式化在本地运行，源文本不会被上传。",
  "meta.og-title": "Wikitext Formatter",
  "meta.og-description": "基于浏览器的 MediaWiki Wikitext 格式化工具",

  // Universal plural forms (Chinese does not use grammatical plurals)
  "plural.templates": "{count} 个模板",
  "plural.tables": "{count} 个表格",
  "plural.list-lines": "{count} 个列表行",
  "plural.categories": "{count} 个分类",
  "plural.file-links": "{count} 个文件链接",
  "plural.wikilinks": "{count} 个内部链接",
  "plural.external-links": "{count} 个外部链接",
  "plural.references": "{count} 个引用",
  "plural.entries": "{count} 条",

  // Generic
  "generic.unexpected-error": "格式化器发生意外错误",

  // Web client errors
  "error.worker-not-ready": "格式化器 Worker 尚未就绪。",
  "error.worker-initialization-failed": "格式化器 Worker 初始化失败。",
  "error.worker-invalid-response": "格式化器 Worker 返回了无效响应。",
  "error.worker-invalid-generation": "格式化器 Worker 返回了无效代次。",
  "error.client-disposed": "格式化器客户端已不可用。",
  "error.request-rejected": "格式化请求被拒绝。",
  "error.unknown": "格式化器发生意外错误。",
};

export const locale: SupportedLocale = "zh-Hans";
