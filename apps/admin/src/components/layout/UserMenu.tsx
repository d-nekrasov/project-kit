import { LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { PwaInstallButton } from '@/components/layout/PwaInstallButton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/use-auth';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { useI18n } from '@/lib/i18n/use-i18n';

function getInitial(value?: string | null) {
  return (value ?? 'U').slice(0, 1).toUpperCase();
}

export function UserMenu() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const { install, installFallbackMode, isInstalling, needsBrowserInstallFallback, showInstallButton } = usePwaInstallPrompt();
  const displayName = auth.user?.name ?? auth.user?.email ?? 'User';
  const installHelpText =
    installFallbackMode === 'safari'
      ? 'В Safari установка выполняется через меню браузера. На macOS используйте File -> Add to Dock. На iPhone или iPad используйте Share -> Add to Home Screen.'
      : 'В этом браузере установка сейчас доступна через встроенную кнопку в адресной строке. Нажмите значок установки справа от URL и подтвердите установку.';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-2 rounded-full px-2"
          aria-label={t('layout.openUserMenu')}
        >
          <Avatar>
            <AvatarFallback>{getInitial(displayName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm font-medium lg:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      {open ? (
        <DropdownMenuContent className="w-56">
          <div className="px-2 py-1.5">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{auth.user?.email}</div>
          </div>
          <Separator className="my-1" />
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
          >
            <UserRound className="mr-2 size-4" aria-hidden="true" />
            {t('layout.profile')}
          </DropdownMenuItem>
          {showInstallButton ? (
            <PwaInstallButton
              isInstalling={isInstalling}
              onInstall={install}
              onOpenFallback={() => {
                setOpen(false);
                setInstallHelpOpen(true);
              }}
              useBrowserFallback={needsBrowserInstallFallback}
            />
          ) : null}
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              auth.logout();
              navigate('/login');
            }}
          >
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            {t('auth.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      ) : null}
      <Dialog open={installHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Установить приложение</DialogTitle>
            <DialogDescription>{installHelpText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setInstallHelpOpen(false)} type="button" variant="outline">
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
