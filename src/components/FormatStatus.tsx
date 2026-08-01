import { AlertOctagon, CheckCircle2, CircleDot, Clock3, LoaderCircle } from "lucide-react";
import type { FormatStatus as Status } from "../formatter/resultSummary.js";
import { useI18n } from "../i18n/useI18n.js";

interface FormatStatusProps {
  status: Status;
  profile: string;
  webVersion: string;
  formatterVersion: string;
}

function useStatusPresentation(status: Status) {
  const { t } = useI18n();
  switch (status.kind) {
    case "formatting":
      return { label: t("status.formatting"), className: "is-running", icon: <LoaderCircle className="spin" size={17} /> };
    case "changed":
      return { label: t("status.changed"), className: "is-success", icon: <CheckCircle2 size={17} /> };
    case "unchanged":
      return { label: t("status.unchanged"), className: "is-neutral", icon: <CircleDot size={17} /> };
    case "failure":
      return { label: t("status.fail-closed"), className: "is-failure", icon: <AlertOctagon size={17} /> };
    case "error":
      return { label: t("status.unexpected-error"), className: "is-failure", icon: <AlertOctagon size={17} /> };
    default:
      return { label: t("status.ready"), className: "is-neutral", icon: <CircleDot size={17} /> };
  }
}

export function FormatStatus({ status, profile, webVersion, formatterVersion }: FormatStatusProps) {
  const { t } = useI18n();
  const presentation = useStatusPresentation(status);
  const duration = "durationMs" in status ? status.durationMs : undefined;
  const profileMessageKeys = {
    default: "settings.profile.default",
    production: "settings.profile.production",
    aggressive: "settings.profile.aggressive",
  } as const;
  const profileKey = profileMessageKeys[profile as keyof typeof profileMessageKeys];
  return (
    <div className="format-status" role="status" aria-live="polite">
      <span className={`status-kind ${presentation.className}`}>{presentation.icon}{presentation.label}</span>
      {duration !== undefined ? (
        <span><Clock3 size={15} aria-hidden="true" /> {duration.toFixed(1)} ms</span>
      ) : null}
      <span className="status-profile">{t("status.profile")}: <strong>{profileKey ? t(profileKey) : profile}</strong></span>
      <span className="status-versions">{t("status.versions", { web: webVersion, fmt: formatterVersion })}</span>
    </div>
  );
}
