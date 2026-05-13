import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';

type RequirePermissionProps = {
  permission?: string | null;
  children: ReactNode;
};

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!permission) {
    return children;
  }

  if (auth.isLoading || auth.isPermissionsLoading) {
    return <LoadingScreen />;
  }

  if (!auth.hasPermission(permission)) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="max-w-md rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Access denied</h2>
          <p className="mt-2 text-sm text-slate-600">You do not have permission to view this page.</p>
          <Button type="button" className="mt-5" onClick={() => navigate('/')}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
