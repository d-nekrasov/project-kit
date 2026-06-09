import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AdminLayout() {
  return (
    <SidebarProvider className="bg-muted/40">
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <OfflineBanner />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
