import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  async function handleUpdate() {
    if (isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateFailed(false);
      await updateServiceWorker(true);
    } catch (error) {
      void error;
      setIsUpdating(false);
      setUpdateFailed(true);
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
            <AlertDescription>
              {updateFailed
                ? 'Не удалось применить обновление. Повторите попытку.'
                : 'Обновление будет применено после перезагрузки текущего интерфейса.'}
            </AlertDescription>
          </div>
          <Button className="shrink-0" disabled={isUpdating} onClick={handleUpdate} size="sm">
            Обновить
          </Button>
        </div>
      </Alert>
    </div>
  );
}
