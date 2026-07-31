import { AlertOctagon, CheckCircle2, CircleDot, Clock3, LoaderCircle } from "lucide-react";
import type { FormatStatus as Status } from "../formatter/resultSummary.js";
import { FORMATTER_VERSION } from "../settings/defaults.js";

interface FormatStatusProps {
  status: Status;
  profile: string;
  version?: string;
}

function statusPresentation(status: Status) {
  switch (status.kind) {
    case "formatting":
      return { label: "Formatting…", className: "is-running", icon: <LoaderCircle className="spin" size={17} /> };
    case "changed":
      return { label: "Formatted with changes", className: "is-success", icon: <CheckCircle2 size={17} /> };
    case "unchanged":
      return { label: "Already formatted", className: "is-neutral", icon: <CircleDot size={17} /> };
    case "failure":
      return { label: "Fail-closed", className: "is-failure", icon: <AlertOctagon size={17} /> };
    case "error":
      return { label: "Unexpected error", className: "is-failure", icon: <AlertOctagon size={17} /> };
    default:
      return { label: "Ready", className: "is-neutral", icon: <CircleDot size={17} /> };
  }
}

export function FormatStatus({ status, profile, version = FORMATTER_VERSION }: FormatStatusProps) {
  const presentation = statusPresentation(status);
  const duration = "durationMs" in status ? status.durationMs : undefined;
  return (
    <div className="format-status" role="status" aria-live="polite">
      <span className={`status-kind ${presentation.className}`}>{presentation.icon}{presentation.label}</span>
      {duration !== undefined ? (
        <span><Clock3 size={15} aria-hidden="true" /> {duration.toFixed(1)} ms</span>
      ) : null}
      <span>Profile: <strong>{profile[0]?.toUpperCase()}{profile.slice(1)}</strong></span>
      <span>Package: <strong>wikitext-fmt {version}</strong></span>
    </div>
  );
}
