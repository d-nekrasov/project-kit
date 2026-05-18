type AudioContextConstructor = typeof AudioContext;

declare global {
  interface Window {
    webkitAudioContext?: AudioContextConstructor;
  }
}

let audioContext: AudioContext | null = null;
let unlockAttempted = false;
const NOTIFICATION_VOLUME = 1.0;

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  audioContext ??= new AudioContextClass();

  return audioContext;
}

function playTone(context: AudioContext, volume: number, duration: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration - 0.02);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

export function unlockNotificationSound(): void {
  if (unlockAttempted) {
    return;
  }

  unlockAttempted = true;

  try {
    const context = getAudioContext();

    if (!context) {
      return;
    }

    const playUnlockTone = () => playTone(context, 0.0001, 0.03);

    if (context.state === 'suspended') {
      void context.resume().then(playUnlockTone).catch(() => {
        unlockAttempted = false;
      });
      return;
    }

    playUnlockTone();
  } catch {
    // Browsers can block audio until the user has interacted with the page.
    unlockAttempted = false;
  }
}

export function playNotificationSound(): void {
  try {
    const context = getAudioContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
    void context.resume().then(() => playTone(context, NOTIFICATION_VOLUME, 0.2));
    return;
  }

    playTone(context, NOTIFICATION_VOLUME, 0.2);
  } catch {
    // Ignore best-effort notification sound failures.
  }
}
