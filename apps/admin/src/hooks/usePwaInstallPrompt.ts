import { useCallback, useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptOutcome = 'accepted' | 'dismissed';
type InstallFallbackMode = 'browser-ui' | 'safari' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: BeforeInstallPromptOutcome;
    platform: string;
  }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isChromiumLikeBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent;

  return /(Chrome|Chromium|Edg|OPR)/.test(userAgent) && !/(Firefox|FxiOS|CriOS)/.test(userAgent);
}

function isSafariBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent;

  return /Safari/.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS)/.test(userAgent);
}

function resolveFallbackMode(): InstallFallbackMode {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!import.meta.env.PROD || !window.isSecureContext || !hasManifestLink() || isStandaloneMode()) {
    return null;
  }

  if (isChromiumLikeBrowser()) {
    return 'browser-ui';
  }

  if (isSafariBrowser()) {
    return 'safari';
  }

  return null;
}

function hasManifestLink(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.querySelector('link[rel="manifest"]') !== null;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [isInstalling, setIsInstalling] = useState(false);
  const [installFallbackMode, setInstallFallbackMode] = useState<InstallFallbackMode>(() => resolveFallbackMode());

  const resetPrompt = useCallback(() => {
    setDeferredPrompt(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();

      if (isStandaloneMode()) {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return;
      }

      setDeferredPrompt(event);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstalling(false);
      setDeferredPrompt(null);
    };

    const handleDisplayModeChange = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);
      setInstallFallbackMode(installed ? null : resolveFallbackMode());

      if (installed) {
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneMediaQuery.addEventListener('change', handleDisplayModeChange);

    handleDisplayModeChange();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt || isInstalling || isInstalled) {
      return false;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      const accepted = choice.outcome === 'accepted';

      setIsInstalled(accepted || isStandaloneMode());
      resetPrompt();

      return accepted;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, isInstalled, isInstalling, resetPrompt]);

  const canInstall = useMemo(() => !isInstalled && deferredPrompt !== null, [deferredPrompt, isInstalled]);
  const needsBrowserInstallFallback = useMemo(
    () => !canInstall && !isInstalled && installFallbackMode !== null,
    [canInstall, installFallbackMode, isInstalled]
  );

  return {
    canInstall,
    install,
    installFallbackMode,
    isInstalled,
    isInstalling,
    needsBrowserInstallFallback,
    showInstallButton: canInstall || needsBrowserInstallFallback
  };
}
