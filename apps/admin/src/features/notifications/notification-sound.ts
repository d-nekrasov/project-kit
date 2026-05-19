type AudioContextConstructor = typeof AudioContext;

declare global {
  interface Window {
    webkitAudioContext?: AudioContextConstructor;
  }
}

let audioContext: AudioContext | null = null;
let enablePromise: Promise<boolean> | null = null;
const NOTIFICATION_VOLUME = 0.45;

function createAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  return new AudioContextClass();
}

function playTone(context: AudioContext, volume: number, duration: number, frequency: number, delay = 0): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration - 0.02);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

function playNotificationChime(context: AudioContext): void {
  playTone(context, NOTIFICATION_VOLUME, 0.16, 784);
  playTone(context, NOTIFICATION_VOLUME * 0.8, 0.2, 1046.5, 0.12);
}

export function isNotificationSoundReady(): boolean {
  return audioContext?.state === 'running';
}

export async function enableNotificationSound(options: { test?: boolean } = {}): Promise<boolean> {
  if (enablePromise) {
    return enablePromise;
  }

  enablePromise = (async () => {
    if (audioContext && audioContext.state === 'closed') {
      audioContext = null;
    }

    audioContext ??= createAudioContext();
    const context = audioContext;

    if (!context) {
      return false;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (context.state !== 'running') {
      return false;
    }

    if (options.test) {
      playNotificationChime(context);
    } else {
      playTone(context, 0.0001, 0.03, 880);
    }

    return true;
  })()
    .catch(() => false)
    .finally(() => {
      enablePromise = null;
    });

  return enablePromise;
}

export function unlockNotificationSound(): void {
  void enableNotificationSound();
}

export function playNotificationSound(): void {
  try {
    const context = audioContext;

    if (!context) {
      return;
    }

    if (context.state !== 'running') {
      return;
    }

    playNotificationChime(context);
  } catch {
    // Ignore best-effort notification sound failures.
  }
}
