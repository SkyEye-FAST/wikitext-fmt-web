import {
  Clipboard,
  Download,
  FileInput,
  GitCompareArrows,
  Play,
  Replace,
  RotateCcw,
  Settings,
  Square,
  Trash2,
} from "lucide-react";

import { useI18n } from "../i18n/useI18n.js";

interface EditorToolbarProps {
  busy: boolean;
  hasOutput: boolean;
  canApplyOutput: boolean;
  diffVisible: boolean;
  onFormat: () => void;
  onStop: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onApplyOutput: () => void;
  onOpenFile: () => void;
  onClear: () => void;
  onLoadExample: () => void;
  onOpenSettings: () => void;
  onToggleDiff: () => void;
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
}

function ToolbarButton({
  icon,
  children,
  className = "",
  ...props
}: ToolbarButtonProps) {
  return (
    <button type="button" className={`toolbar-button ${className}`} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { t } = useI18n();
  return (
    <nav className="editor-toolbar" aria-label={t("toolbar.aria-label")}>
      {props.busy ? (
        <ToolbarButton
          className="button-stop"
          icon={<Square size={17} />}
          onClick={props.onStop}
        >
          {t("toolbar.stop")}
        </ToolbarButton>
      ) : (
        <ToolbarButton
          className="button-primary"
          icon={<Play size={17} />}
          onClick={props.onFormat}
        >
          {t("toolbar.format")}
        </ToolbarButton>
      )}
      <ToolbarButton
        icon={<Clipboard size={17} />}
        onClick={props.onCopy}
        disabled={!props.hasOutput}
      >
        {t("toolbar.copy-output")}
      </ToolbarButton>
      <ToolbarButton
        icon={<Download size={17} />}
        onClick={props.onDownload}
        disabled={!props.hasOutput}
      >
        {t("toolbar.download")}
      </ToolbarButton>
      <ToolbarButton
        icon={<Replace size={17} />}
        onClick={props.onApplyOutput}
        disabled={!props.canApplyOutput}
        title={
          props.canApplyOutput
            ? t("toolbar.apply-output")
            : t("toolbar.apply-output-unavailable")
        }
      >
        {t("toolbar.apply-output")}
      </ToolbarButton>
      <ToolbarButton icon={<FileInput size={17} />} onClick={props.onOpenFile}>
        {t("toolbar.open-file")}
      </ToolbarButton>
      <ToolbarButton icon={<Trash2 size={17} />} onClick={props.onClear}>
        {t("toolbar.clear")}
      </ToolbarButton>
      <ToolbarButton
        icon={<RotateCcw size={17} />}
        onClick={props.onLoadExample}
      >
        {t("toolbar.load-example")}
      </ToolbarButton>
      <ToolbarButton
        icon={<Settings size={17} />}
        onClick={props.onOpenSettings}
      >
        {t("toolbar.settings")}
      </ToolbarButton>
      <ToolbarButton
        icon={<GitCompareArrows size={17} />}
        onClick={props.onToggleDiff}
        disabled={!props.hasOutput}
        aria-pressed={props.diffVisible}
        className={props.diffVisible ? "is-active" : ""}
      >
        {t("toolbar.diff")}
      </ToolbarButton>
    </nav>
  );
}
