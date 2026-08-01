import type { SupportedLocale } from "./locales.js";
import type { MessageCatalog } from "./messages.en.js";

export const messages: MessageCatalog = {
  // Brand
  "brand.name": "Wikitext Formatter",
  "brand.tagline": "在本機安全執行的 MediaWiki 原始碼格式化工具",

  // Language selector
  "language.label": "語言",
  "language.follow-browser": "跟隨瀏覽器語言",
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
  "init.initializing": "正在初始化本機格式化器 Worker……",
  "init.retry-worker": "重試 Worker",

  // Toolbar
  "toolbar.aria-label": "格式化器操作",
  "toolbar.format": "格式化",
  "toolbar.stop": "停止",
  "toolbar.copy-output": "複製輸出",
  "toolbar.download": "下載",
  "toolbar.apply-output": "套用輸出",
  "toolbar.apply-output-unavailable": "僅能套用目前且成功的格式化結果。",
  "toolbar.open-file": "開啟檔案",
  "toolbar.clear": "清空",
  "toolbar.load-example": "載入範例",
  "toolbar.settings": "設定",
  "toolbar.diff": "比對",

  // Source editor
  "editor.source.label": "原始碼",
  "editor.source.muted": "Wikitext",
  "editor.output.label": "格式化輸出",
  "editor.output.muted": "唯讀",
  "editor.stats.aria": "{lines} 行，{characters} 個字元",
  "editor.stats.visible": "{lines} 行 · {characters} 個字元",

  // EditorPane misc
  "editor.file-not-readable": "所選檔案無法在此瀏覽器中讀取。",
  "editor.large-file-warning":
    "檔案很大，格式化可能要花比較久的時間；你可以隨時停止 Worker。",

  // Diff view
  "diff.title": "格式化前後比對",
  "diff.side-by-side": "並排檢視",
  "diff.unified": "合併檢視",
  "diff.original.aria": "原始 Wikitext",
  "diff.formatted.aria": "格式化後的 Wikitext",
  "diff.unified.aria": "合併檢視中的 Wikitext 差異",
  "diff.loading": "正在載入比對工具……",
  "diff.previous-run": "前一次格式化執行",

  // Status bar
  "status.ready": "就緒",
  "status.formatting": "正在格式化……",
  "status.changed": "已格式化，有變更",
  "status.unchanged": "格式已是最新",
  "status.fail-closed": "安全中止",
  "status.unexpected-error": "意外錯誤",
  "status.outdated": "輸出已過期",
  "status.outdated.detail": "產生此結果後，原始碼或格式化設定已變更。",
  "status.applied": "已套用格式化輸出",
  "status.profile": "設定檔",
  "status.versions": "Web {web} · 格式化器 {fmt}",

  // Privacy
  "privacy.notice": "格式化會在你的瀏覽器中本機進行，不會上傳你的 Wikitext。",

  // Diagnostics
  "diagnostics.title": "診斷",
  "diagnostics.entries": "{count} 項規則診斷",
  "diagnostics.empty": "最近一次執行沒有失敗、警告或規則診斷。",
  "diagnostics.table.rule": "規則",
  "diagnostics.table.severity": "嚴重性",
  "diagnostics.table.message": "訊息",
  "diagnostics.severity.warning": "警告",
  "diagnostics.severity.info": "資訊",
  "diagnostics.stage": "階段",
  "diagnostics.aria": "診斷詳細資料",
  "layout.status-diagnostics": "格式化狀態和診斷",

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
  "settings.inline-spacing": "行內間距",
  "settings.inline-spacing.auto": "自動",
  "settings.inline-spacing.compact": "緊湊",
  "settings.inline-spacing.spaced": "加空格",
  "settings.parameter-layout": "參數佈局",
  "settings.parameter-layout.compact": "緊湊",
  "settings.parameter-layout.flush": "齊頭",
  "settings.parameter-layout.indented": "縮排",
  "settings.format-template-params": "格式化範本參數（實驗性）",
  "settings.tables": "表格",
  "settings.format-tables": "格式化表格",
  "settings.cell-separator": "儲存格分隔符",
  "settings.cell-separator.auto": "自動",
  "settings.cell-separator.split": "分行",
  "settings.cell-separator.preserve": "保留",
  "settings.structure": "結構",
  "settings.headings": "標題",
  "settings.lists": "清單",
  "settings.section-spacing": "章節間距",
  "settings.normalize-blank-lines": "統一空白行",
  "settings.html-void-tags": "HTML 空元素標籤",
  "settings.html-void-tags.html5": "HTML5",
  "settings.html-void-tags.xhtml": "XHTML",
  "settings.html-void-tags.preserve": "保留",
  "settings.links-metadata": "連結和中繼資料",
  "settings.categories": "分類",
  "settings.file-links": "檔案連結",
  "settings.wikilinks": "內部連結",
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
  "settings.interlanguage-prefixes": "跨語言前綴",
  "settings.parser-config": "解析器設定",
  "settings.parser-config.value": "MediaWiki 自帶的瀏覽器設定",
  "settings.restore-core-defaults": "還原核心預設值",
  "settings.reset-settings": "重設設定",

  // Formatter status
  "status.worker-not-ready": "格式化器 Worker 尚未就緒。",
  "status.source-changed":
    "格式化過程中原始碼已變更，先前的結果已捨棄，請重新格式化以更新輸出。",
  "status.formatting-stopped": "格式化已停止。格式化器 Worker 已重新啟動。",
  "status.result-discarded": "格式化過程中原始碼或格式化設定已變更，這次結果已捨棄。",

  // Clipboard and copy
  "copy.success": "格式化輸出已複製到剪貼簿。",
  "copy.denied": "無法存取剪貼簿，請手動選取並複製輸出。",

  // Result summary — generated by summarizeRuleDiagnostics
  "summary.templates-changed": "已格式化 {count} 個範本。",
  "summary.templates-skipped": "已跳過 {count} 個無法確定的範本。",
  "summary.tables-changed": "已格式化 {count} 個表格。",
  "summary.tables-skipped": "已跳過 {count} 個無法確定的表格。",
  "summary.lists-changed": "已格式化 {count} 個清單行。",
  "summary.categories-moved": "已移動 {count} 個分類。",
  "summary.redirects-formatted": "已格式化重新導向指令。",
  "summary.file-links-formatted": "已格式化 {count} 個檔案連結。",
  "summary.wikilinks-formatted": "已格式化 {count} 個內部連結。",
  "summary.external-links-formatted": "已格式化 {count} 個外部連結。",
  "summary.references-formatted": "已格式化 {count} 個引用。",
  "summary.section-spacing-normalized": "已統一章節標題周圍的間距。",
  "summary.equivalence-failed": "無法驗證 {structure} 的等價性。",

  // Document title and meta
  "document.title.default": "Wikitext Formatter",
  "document.title.example": "範例 — Wikitext Formatter",
  "meta.description":
    "在瀏覽器中執行的 MediaWiki Wikitext 格式化工具。格式化會在本機進行，原始碼不會被上傳。",
  "meta.og-title": "Wikitext Formatter",
  "meta.og-description": "在瀏覽器中執行的 MediaWiki Wikitext 格式化工具",

  // Universal plural forms (Chinese does not use grammatical plurals)
  "plural.templates": "{count} 個範本",
  "plural.tables": "{count} 個表格",
  "plural.list-lines": "{count} 個清單行",
  "plural.categories": "{count} 個分類",
  "plural.file-links": "{count} 個檔案連結",
  "plural.wikilinks": "{count} 個內部連結",
  "plural.external-links": "{count} 個外部連結",
  "plural.references": "{count} 個引用",
  "plural.entries": "{count} 條",

  // Generic
  "generic.unexpected-error": "格式化器發生意外錯誤",

  // Web client errors
  "error.worker-not-ready": "格式化器 Worker 尚未就緒。",
  "error.worker-initialization-failed": "格式化器 Worker 初始化失敗。",
  "error.worker-invalid-response": "格式化器 Worker 傳回了無效回應。",
  "error.worker-invalid-generation": "格式化器 Worker 傳回了無效的代次編號。",
  "error.client-disposed": "格式化器用戶端已失效。",
  "error.request-rejected": "格式化要求被拒絕。",
  "error.unknown": "格式化器發生意外錯誤。",
};

export const locale: SupportedLocale = "zh-Hant";
