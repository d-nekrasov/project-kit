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
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/use-auth';
import { useI18n } from '@/lib/i18n/use-i18n';

function getInitial(value?: string | null) {
  return (value ?? 'U').slice(0, 1).toUpperCase();
}

export function UserMenu() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const displayName = auth.user?.name ?? auth.user?.email ?? 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-2 rounded-full px-2"
          aria-label={t('layout.openUserMenu')}
          onClick={() => setOpen((value) => !value)}
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
    </DropdownMenu>
  );
}
