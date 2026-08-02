import { ShieldCheck } from "lucide-react";

import { useI18n } from "../i18n/useI18n.js";

export function PrivacyNotice() {
  const { t } = useI18n();
  return (
    <p className="privacy-notice">
      <ShieldCheck size={17} aria-hidden="true" />
      <span>{t("privacy.notice")}</span>
    </p>
  );
}
