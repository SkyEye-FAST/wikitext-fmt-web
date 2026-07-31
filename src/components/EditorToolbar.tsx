import {
  Clipboard,
  Download,
  FileInput,
  GitCompareArrows,
  Play,
  RotateCcw,
  Settings,
  Square,
  Trash2,
} from "lucide-react";

interface EditorToolbarProps {
  busy: boolean;
  hasOutput: boolean;
  diffVisible: boolean;
  onFormat: () => void;
  onStop: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onOpenFile: () => void;
  onClear: () => void;
  onLoadExample: () => void;
  onOpenSettings: () => void;
  onToggleDiff: () => void;
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
}

function ToolbarButton({ icon, children, className = "", ...props }: ToolbarButtonProps) {
  return (
    <button type="button" className={`toolbar-button ${className}`} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function EditorToolbar(props: EditorToolbarProps) {
  return (
    <nav className="editor-toolbar" aria-label="Formatter actions">
      {props.busy ? (
        <ToolbarButton className="button-stop" icon={<Square size={17} />} onClick={props.onStop}>
          Stop
        </ToolbarButton>
      ) : (
        <ToolbarButton className="button-primary" icon={<Play size={17} />} onClick={props.onFormat}>
          Format
        </ToolbarButton>
      )}
      <ToolbarButton icon={<Clipboard size={17} />} onClick={props.onCopy} disabled={!props.hasOutput}>
        Copy output
      </ToolbarButton>
      <ToolbarButton icon={<Download size={17} />} onClick={props.onDownload} disabled={!props.hasOutput}>
        Download
      </ToolbarButton>
      <ToolbarButton icon={<FileInput size={17} />} onClick={props.onOpenFile}>Open file</ToolbarButton>
      <ToolbarButton icon={<Trash2 size={17} />} onClick={props.onClear}>Clear</ToolbarButton>
      <ToolbarButton icon={<RotateCcw size={17} />} onClick={props.onLoadExample}>Load example</ToolbarButton>
      <ToolbarButton icon={<Settings size={17} />} onClick={props.onOpenSettings}>Settings</ToolbarButton>
      <ToolbarButton
        icon={<GitCompareArrows size={17} />}
        onClick={props.onToggleDiff}
        disabled={!props.hasOutput}
        aria-pressed={props.diffVisible}
        className={props.diffVisible ? "is-active" : ""}
      >
        Diff
      </ToolbarButton>
    </nav>
  );
}
