import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('PWA service worker registration failed', error);
    }
  });

  useEffect(() => {
    if (offlineReady && import.meta.env.DEV) {
      console.debug('PWA offline cache is ready');
    }
  }, [offlineReady]);

  if (!needRefresh) {
    return null;
  }

  async function handleUpdate() {
    if (isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);
      await updateServiceWorker(true);
    } catch (error) {
      setIsUpdating(false);
      console.error('PWA update failed', error);
    }
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-[var(--z-floating)] sm:left-auto sm:w-full sm:max-w-md">
      <Alert className="pointer-events-auto border-primary/15 bg-card shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
            <RefreshCw className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <AlertTitle>Доступна новая версия приложения</AlertTitle>
            <AlertDescription>Обновление будет применено после перезагрузки текущего интерфейса.</AlertDescription>
          </div>
          <Button className="shrink-0" disabled={isUpdating} onClick={handleUpdate} size="sm">
            Обновить
          </Button>
        </div>
      </Alert>
    </div>
  );
}
