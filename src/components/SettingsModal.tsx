import { useEffect, useRef } from 'react';

import type { FontSize, Theme } from '../hooks/useAppSettings';
import type { SmartSearchPhase } from '../hooks/useSmartSearch';
import NotificationPreferences from './NotificationPreferences';

interface SettingsModalProps {
  phase: SmartSearchPhase;
  onAcceptSmartSearch: () => void;
  onDeclineSmartSearch: () => void;
  onClose: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  fontSize: FontSize;
  onSetFontSize: (s: FontSize) => void;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const FONT_SIZES: { value: FontSize; label: string; aria: string }[] = [
  { value: 'small', label: 'A', aria: 'Small' },
  { value: 'medium', label: 'A', aria: 'Medium' },
  { value: 'large', label: 'A', aria: 'Large' },
];

export default function SettingsModal({
  phase,
  onAcceptSmartSearch,
  onDeclineSmartSearch,
  onClose,
  theme,
  onSetTheme,
  fontSize,
  onSetFontSize,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  const smartToggleOn = phase === 'ready' || phase === 'idle';
  const smartToggleDisabled = phase === 'loading' || phase === 'error';

  function handleSmartSearchToggle() {
    if (smartToggleDisabled) return;
    if (smartToggleOn) {
      onDeclineSmartSearch();
    } else {
      onAcceptSmartSearch();
    }
  }

  let smartStatusLabel: string;
  if (phase === 'loading') smartStatusLabel = 'Loading…';
  else if (phase === 'error') smartStatusLabel = 'Unavailable';
  else if (smartToggleOn) smartStatusLabel = 'On';
  else smartStatusLabel = 'Off';

  return (
    <dialog
      ref={dialogRef}
      className="settings-modal"
      aria-label="Settings"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="settings-modal__panel">
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">Settings</h2>
          <button
            type="button"
            className="settings-modal__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Theme */}
        <div className="settings-modal__section">
          <div className="settings-modal__row">
            <div>
              <div className="settings-modal__section-title">Theme</div>
              <div className="settings-modal__section-desc">Appearance of the app</div>
            </div>
            <div className="settings-segment" role="group" aria-label="Theme">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className={`settings-segment__btn${theme === t.value ? ' settings-segment__btn--active' : ''}`}
                  onClick={() => onSetTheme(t.value)}
                  aria-pressed={theme === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Font size */}
        <div className="settings-modal__section">
          <div className="settings-modal__row">
            <div>
              <div className="settings-modal__section-title">Text size</div>
              <div className="settings-modal__section-desc">Adjust the reading size</div>
            </div>
            <div
              className="settings-segment settings-segment--font"
              role="group"
              aria-label="Text size"
            >
              {FONT_SIZES.map((f, i) => (
                <button
                  key={f.value}
                  type="button"
                  className={`settings-segment__btn settings-segment__btn--font-${f.value}${fontSize === f.value ? ' settings-segment__btn--active' : ''}`}
                  onClick={() => onSetFontSize(f.value)}
                  aria-pressed={fontSize === f.value}
                  aria-label={f.aria}
                  style={{ fontSize: `${0.75 + i * 0.15}rem` }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Smart search */}
        <div className="settings-modal__section">
          <div className="settings-modal__row">
            <div>
              <div className="settings-modal__section-title">Smart search</div>
              <div className="settings-modal__section-desc">
                Semantic AI ranking — finds relevant events even when keywords don&apos;t match.
                Requires a ~23 MB model download.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={smartToggleOn}
              disabled={smartToggleDisabled}
              className={`settings-toggle${smartToggleOn ? ' settings-toggle--on' : ''}${smartToggleDisabled ? ' settings-toggle--disabled' : ''}`}
              onClick={handleSmartSearchToggle}
              aria-label={`Smart search: ${smartStatusLabel}`}
            >
              <span className="settings-toggle__track">
                <span className="settings-toggle__thumb" />
              </span>
              <span className="settings-toggle__label">{smartStatusLabel}</span>
            </button>
          </div>
        </div>

        {/* Notification preferences (only shown if permission granted) */}
        <NotificationPreferences />
      </div>
    </dialog>
  );
}
