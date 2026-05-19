import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppLayout() {
  return (
    <SidebarProvider className="bg-slate-50">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
