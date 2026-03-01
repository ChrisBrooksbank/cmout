import { useEffect, useState } from 'react';

type PermissionState = 'default' | 'granted' | 'denied';

function getNotificationPermission(): PermissionState {
  if (!('Notification' in window) || !window.Notification) return 'denied';
  return Notification.permission as PermissionState;
}

export default function PushNotificationPrompt() {
  const [permission, setPermission] = useState<PermissionState>(getNotificationPermission);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !window.Notification) return;

    const handleInteraction = () => setHasInteracted(true);

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('scroll', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };
  }, []);

  async function handleEnableClick() {
    if (!('Notification' in window) || !window.Notification) return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
  }

  function handleDismiss() {
    setDismissed(true);
  }

  if (!('Notification' in window) || !window.Notification) return null;
  if (!hasInteracted) return null;
  if (permission !== 'default') return null;
  if (dismissed) return null;

  return (
    <div className="push-prompt" role="complementary" aria-label="Enable notifications">
      <p className="push-prompt__text">
        Get notified about new Chelmsford events matching your interests
      </p>
      <div className="push-prompt__actions">
        <button className="push-prompt__button" onClick={() => void handleEnableClick()}>
          Enable notifications
        </button>
        <button className="push-prompt__dismiss" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
