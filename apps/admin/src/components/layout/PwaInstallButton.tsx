import { Download } from 'lucide-react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type PwaInstallButtonProps = {
  isInstalling?: boolean;
  onInstall: () => void | Promise<unknown>;
  onOpenFallback?: () => void;
  useBrowserFallback?: boolean;
};

export function PwaInstallButton({
  isInstalling = false,
  onInstall,
  onOpenFallback,
  useBrowserFallback = false
}: PwaInstallButtonProps) {
  return (
    <DropdownMenuItem
      disabled={isInstalling}
      onSelect={() => {
        if (useBrowserFallback) {
          onOpenFallback?.();
          return;
        }

        void onInstall();
      }}
    >
      <Download className="mr-2 size-4" aria-hidden="true" />
      Установить приложение
    </DropdownMenuItem>
  );
}
