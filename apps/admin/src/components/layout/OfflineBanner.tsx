import { WifiOff } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <Alert className="mx-auto flex w-full max-w-7xl items-start gap-3 border-amber-300 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <AlertDescription className="text-sm text-current">
          Нет соединения с интернетом. Часть данных может быть недоступна.
        </AlertDescription>
      </Alert>
    </div>
  );
}
