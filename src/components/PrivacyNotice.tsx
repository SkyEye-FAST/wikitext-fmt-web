import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <p className="privacy-notice">
      <ShieldCheck size={17} aria-hidden="true" />
      <span>Formatting runs locally in your browser. Your Wikitext is not uploaded.</span>
    </p>
  );
}
