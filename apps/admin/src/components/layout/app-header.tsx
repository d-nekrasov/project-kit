import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { OrganizationSwitcher } from '@/components/layout/organization-switcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { NotificationBell } from '@/features/notifications/notification-bell';

export function AppHeader() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold">{import.meta.env.VITE_APP_NAME || 'Project Kit'}</h1>
      </div>

      <div className="flex items-center gap-3">
        <OrganizationSwitcher />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="sm" onClick={() => setMenuOpen((value) => !value)}>
              <Avatar>
                <AvatarFallback>{(auth.user?.name ?? auth.user?.email ?? 'U').slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          {menuOpen ? (
            <DropdownMenuContent>
              <div className="px-2 py-1 text-xs text-slate-500">{auth.user?.email}</div>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  auth.logout();
                  navigate('/login');
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          ) : null}
        </DropdownMenu>
      </div>
    </header>
  );
}
