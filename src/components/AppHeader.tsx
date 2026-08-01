import { Braces, ExternalLink } from "lucide-react";
import { CORE_REPOSITORY_URL, FRONTEND_REPOSITORY_URL } from "../app/routes.js";
import type { ThemePreference } from "../settings/schema.js";

interface AppHeaderProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export function AppHeader({ theme, onThemeChange }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true"><Braces size={24} /></span>
        <div>
          <h1>Wikitext Formatter</h1>
          <p>Safe, local MediaWiki source formatting</p>
        </div>
      </div>
      <div className="header-actions">
        <label className="theme-control">
          <span>Theme</span>
          <select
            aria-label="Theme"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ThemePreference)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <a href={CORE_REPOSITORY_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={15} aria-hidden="true" /> Core
        </a>
        <a href={FRONTEND_REPOSITORY_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={15} aria-hidden="true" /> Frontend
        </a>
      </div>
    </header>
  );
}
