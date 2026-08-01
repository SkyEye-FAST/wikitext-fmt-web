import type { SupportedLocale } from "./locales.js";
import type { MessageCatalog } from "./messages.en.js";

export const messages: MessageCatalog = {
  // Brand
  "brand.name": "Wikitext Formatter",
  "brand.tagline": "安全、本地的 MediaWiki 原始碼格式化",

  // Language selector
  "language.label": "語言",
  "language.follow-browser": "跟隨瀏覽器",
  "language.en": "English",
  "language.zh-Hans": "简体中文",
  "language.zh-Hant": "繁體中文",

  // Theme selector
  "theme.label": "主題",
  "theme.system": "跟隨系統",
  "theme.light": "淺色",
  "theme.dark": "深色",

  // Header links
  "header.core": "核心",
  "header.frontend": "前端",

  // Initialization screen
  "init.initializing": "正在初始化本地格式化器 Worker……",
  "init.retry-worker": "重試 Worker",

  // Toolbar
  "toolbar.aria-label": "格式化器操作",
  "toolbar.format": "格式化",
  "toolbar.stop": "停止",
  "toolbar.copy-output": "複製輸出",
  "toolbar.download": "下載",
  "toolbar.open-file": "開啟檔案",
  "toolbar.clear": "清空",
  "toolbar.load-example": "載入範例",
  "toolbar.settings": "設定",
  "toolbar.diff": "差異",

  // Source editor
  "editor.source.label": "原始碼",
  "editor.source.muted": "Wikitext",
  "editor.output.label": "格式化輸出",
  "editor.output.muted": "唯讀",
  "editor.stats.aria": "{lines} 行，{characters} 個字元",

  // EditorPane misc
  "editor.file-not-readable": "所選檔案在此瀏覽器中無法讀取。",
  "editor.large-file-warning":
    "這是一個非常大的檔案，格式化可能需要更長時間；你可以隨時停止 Worker。",

  // Diff view
  "diff.title": "原始碼與格式化輸出差異",
  "diff.side-by-side": "並排檢視",
  "diff.unified": "統一檢視",
  "diff.original.aria": "原始 Wikitext",
  "diff.formatted.aria": "格式化後的 Wikitext",
  "diff.unified.aria": "統一的 Wikitext 差異",
  "diff.loading": "正在載入差異工具……",

  // Status bar
  "status.ready": "就緒",
  "status.formatting": "正在格式化……",
  "status.changed": "已格式化，有變更",
  "status.unchanged": "已完成格式化",
  "status.fail-closed": "安全中止",
  "status.unexpected-error": "意外錯誤",
  "status.profile": "設定檔",
  "status.versions": "Web {web} · 格式化器 {fmt}",

  // Privacy
  "privacy.notice": "格式化在您的瀏覽器中本機執行。您的 Wikitext 不會被上傳。",

  // Diagnostics
  "diagnostics.title": "診斷",
  "diagnostics.entries": "{count} 條規則項目",
  "diagnostics.empty": "最近一次結果沒有失敗、警告或規則診斷。",
  "diagnostics.table.rule": "規則",
  "diagnostics.table.severity": "嚴重性",
  "diagnostics.table.message": "訊息",
  "diagnostics.severity.warning": "警告",
  "diagnostics.severity.info": "資訊",
  "diagnostics.stage": "階段",
  "diagnostics.aria": "診斷詳細資料",

  // Settings panel
  "settings.title": "格式化器設定",
  "settings.close": "關閉設定",
  "settings.general": "一般",
  "settings.profile": "設定檔",
  "settings.profile.default": "預設",
  "settings.profile.production": "生產",
  "settings.profile.aggressive": "激進",
  "settings.line-width": "行寬",
  "settings.formatting-level": "格式化層級",
  "settings.level.safe": "安全",
  "settings.level.normal": "標準",
  "settings.level.experimental": "實驗",
  "settings.wrap-lines": "自動換行",
  "settings.templates": "範本",
  "settings.format-templates": "格式化範本",
  "settings.inline-spacing": "內聯間距",
  "settings.inline-spacing.auto": "自動",
  "settings.inline-spacing.compact": "緊湊",
  "settings.inline-spacing.spaced": "分散",
  "settings.parameter-layout": "參數佈局",
  "settings.parameter-layout.compact": "緊湊",
  "settings.parameter-layout.flush": "齊平",
  "settings.parameter-layout.indented": "縮排",
  "settings.format-template-params": "格式化範本參數（實驗性）",
  "settings.tables": "表格",
  "settings.format-tables": "格式化表格",
  "settings.cell-separator": "儲存格分隔符",
  "settings.cell-separator.auto": "自動",
  "settings.cell-separator.split": "拆分",
  "settings.cell-separator.preserve": "保留",
  "settings.structure": "結構",
  "settings.headings": "標題",
  "settings.lists": "清單",
  "settings.section-spacing": "章節間距",
  "settings.normalize-blank-lines": "規範化空白行",
  "settings.html-void-tags": "HTML 空元素標籤",
  "settings.html-void-tags.html5": "HTML5",
  "settings.html-void-tags.xhtml": "XHTML",
  "settings.html-void-tags.preserve": "保留",
  "settings.links-metadata": "連結和中繼資料",
  "settings.categories": "分類",
  "settings.file-links": "檔案連結",
  "settings.wikilinks": "Wikilinks",
  "settings.external-links": "外部連結",
  "settings.references": "引用",
  "settings.redirects": "重新導向",
  "settings.behavior-switches": "行為開關",
  "settings.interlanguage-links": "跨語言連結",
  "settings.interlanguage-placement": "跨語言連結位置",
  "settings.interlanguage-placement.preserve": "保留",
  "settings.interlanguage-placement.footer": "頁尾",
  "settings.behavior-switch-placement": "行為開關位置",
  "settings.behavior-switch-placement.preserve": "保留",
  "settings.behavior-switch-placement.footer": "頁尾",
  "settings.interlanguage-prefixes": "跨語言前置詞",
  "settings.parser-config": "解析器設定",
  "settings.parser-config.value": "MediaWiki 捆綁的瀏覽器設定",
  "settings.restore-core-defaults": "還原核心預設值",
  "settings.reset-settings": "重設設定",

  // Formatter status
  "status.worker-not-ready": "格式化器 Worker 尚未就緒。",
  "status.source-changed":
    "原始碼在格式化期間已變更，較早的結果已被捨棄；請重新格式化以更新輸出。",
  "status.formatting-stopped": "格式化已停止。格式化器 Worker 已重新啟動。",

  // Clipboard and copy
  "copy.success": "格式化輸出已複製到剪貼簿。",
  "copy.denied": "剪貼簿存取被拒絕。請手動選取並複製輸出。",

  // Result summary — generated by summarizeRuleDiagnostics
  "summary.templates-changed": "已格式化 {count} 個範本。",
  "summary.templates-skipped": "已跳過 {count} 個不明確的範本。",
  "summary.tables-changed": "已格式化 {count} 個表格。",
  "summary.tables-skipped": "已跳過 {count} 個不明確的表格。",
  "summary.lists-changed": "已格式化 {count} 個清單行。",
  "summary.categories-moved": "已移動 {count} 個分類。",
  "summary.redirects-formatted": "已格式化重新導向指令。",
  "summary.file-links-formatted": "已格式化 {count} 個檔案連結。",
  "summary.wikilinks-formatted": "已格式化 {count} 個 wikilink。",
  "summary.external-links-formatted": "已格式化 {count} 個外部連結。",
  "summary.references-formatted": "已格式化 {count} 個引用。",
  "summary.section-spacing-normalized": "已規範化章節標題周圍的間距。",
  "summary.equivalence-failed": "{structure} 等價性未得到驗證。",

  // Document title and meta
  "document.title.default": "Wikitext Formatter",
  "document.title.example": "範例 — Wikitext Formatter",
  "meta.description":
    "基於瀏覽器的 MediaWiki Wikitext 格式化工具。格式化在本機執行，原始碼不會被上傳。",
  "meta.og-title": "Wikitext Formatter",
  "meta.og-description": "基於瀏覽器的 MediaWiki Wikitext 格式化工具",

  // Universal plural forms (Chinese does not use grammatical plurals)
  "plural.templates": "{count} 個範本",
  "plural.tables": "{count} 個表格",
  "plural.list-lines": "{count} 個清單行",
  "plural.categories": "{count} 個分類",
  "plural.file-links": "{count} 個檔案連結",
  "plural.wikilinks": "{count} 個 wikilink",
  "plural.external-links": "{count} 個外部連結",
  "plural.references": "{count} 個引用",
  "plural.entries": "{count} 條",

  // Generic
  "generic.unexpected-error": "格式化器發生意外錯誤",
};

export const locale: SupportedLocale = "zh-Hant";
