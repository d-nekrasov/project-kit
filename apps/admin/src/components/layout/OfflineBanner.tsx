import { AlertTriangleIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <Alert className="mx-auto w-full max-w-7xl border-amber-200 bg-amber-50/95 text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
        <AlertTriangleIcon className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Нет подключения к сети</AlertTitle>
        <AlertDescription className="text-current/85">
          Нет соединения с интернетом. Часть данных может быть недоступна.
        </AlertDescription>
      </Alert>
    </div>
  );
}
