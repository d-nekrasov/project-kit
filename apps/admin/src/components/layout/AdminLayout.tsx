import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AdminLayout() {
  return (
    <SidebarProvider className="bg-slate-100/70">
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
