const NOTIFICATION_SOUND_ENABLED_KEY = 'project_kit_notification_sound_enabled';

export function getNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(NOTIFICATION_SOUND_ENABLED_KEY) !== 'false';
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(NOTIFICATION_SOUND_ENABLED_KEY, String(enabled));
}
