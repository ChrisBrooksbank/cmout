import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  theme: Theme;
  fontSize: FontSize;
}

const STORAGE_KEY = 'cmout-app-settings';

const FONT_SIZE_PX: Record<FontSize, string> = {
  small: '13px',
  medium: '15px',
  large: '17px',
};

const THEMES: Theme[] = ['dark', 'light', 'system'];

function loadSettings(): AppSettings {
  const settings: AppSettings = { theme: 'system', fontSize: 'medium' };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (typeof parsed === 'object' && parsed !== null) {
      // Ignore unknown values, which would otherwise break the theme/font size
      const { theme, fontSize } = parsed as Record<string, unknown>;
      if (THEMES.includes(theme as Theme)) settings.theme = theme as Theme;
      if (typeof fontSize === 'string' && Object.hasOwn(FONT_SIZE_PX, fontSize)) {
        settings.fontSize = fontSize as FontSize;
      }
    }
  } catch {
    /* ignore */
  }
  return settings;
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function applyTheme(theme: Theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function applyFontSize(fontSize: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_PX[fontSize];
}

export default function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
  }, [settings]);

  function setTheme(theme: Theme) {
    const next = { ...settings, theme };
    setSettings(next);
    saveSettings(next);
  }

  function setFontSize(fontSize: FontSize) {
    const next = { ...settings, fontSize };
    setSettings(next);
    saveSettings(next);
  }

  return { settings, setTheme, setFontSize };
}
