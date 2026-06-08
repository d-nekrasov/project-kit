import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { useI18n } from '@/lib/i18n/use-i18n';

type RequirePermissionProps = {
  permission?: string | null;
  children: ReactNode;
};

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!permission) {
    return children;
  }

  if (auth.isLoading || auth.isPermissionsLoading) {
    return <LoadingScreen />;
  }

  if (!auth.hasPermission(permission)) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="max-w-md rounded-md border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">{t('common.accessDenied')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('common.noPermissionToViewPage')}</p>
          <Button type="button" className="mt-5" onClick={() => navigate('/')}>
            {t('common.goToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
