import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  FileText,
  Layers3,
  ShieldCheck,
  Users
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useI18n } from '@/lib/i18n/use-i18n';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';
import { sdk } from '@/lib/sdk';
import { cn } from '@/lib/utils';

type DashboardQueryKey =
  | 'users'
  | 'roles'
  | 'modules'
  | 'documents'
  | 'systemLogs'
  | 'criticalLogs'
  | 'notifications';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const queryKeys = {
  users: ['dashboard', 'users'] as const,
  roles: ['dashboard', 'roles'] as const,
  modules: ['dashboard', 'modules'] as const,
  documents: ['dashboard', 'documents'] as const,
  systemLogs: ['dashboard', 'system-logs'] as const,
  criticalLogs: ['dashboard', 'critical-logs'] as const,
  notifications: ['dashboard', 'notifications'] as const
};

const quickActions = [
  {
    titleKey: 'navigation.users',
    descriptionKey: 'dashboard.quickActionUsersDescription',
    href: '/users',
    permission: ROUTE_PERMISSIONS['/users'],
    icon: Users
  },
  {
    titleKey: 'navigation.roles',
    descriptionKey: 'dashboard.quickActionRolesDescription',
    href: '/roles',
    permission: ROUTE_PERMISSIONS['/roles'],
    icon: ShieldCheck
  },
  {
    titleKey: 'navigation.modules',
    descriptionKey: 'dashboard.quickActionModulesDescription',
    href: '/modules',
    permission: ROUTE_PERMISSIONS['/modules'],
    icon: Layers3
  },
  {
    titleKey: 'navigation.documents',
    descriptionKey: 'dashboard.quickActionDocumentsDescription',
    href: '/documents',
    permission: ROUTE_PERMISSIONS['/documents'],
    icon: FileText
  }
];

function formatNumber(locale: string, value: number | undefined) {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}

function formatDateTime(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getDashboardStatusLabel(
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
  status: 'operational' | 'needsAttention' | 'critical' | 'warning' | 'unknown'
) {
  const statusKeyMap = {
    operational: 'dashboard.status.operational',
    needsAttention: 'dashboard.status.needsAttention',
    critical: 'dashboard.status.critical',
    warning: 'dashboard.status.warning',
    unknown: 'dashboard.status.unknown'
  } as const;

  return t(statusKeyMap[status]);
}

function getLevelClass(level: string) {
  if (level === 'ERROR' || level === 'FATAL') {
    return 'bg-red-50 text-red-700';
  }

  if (level === 'WARN') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-slate-100 text-foreground/80';
}

function DashboardAlert({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <Alert className="border-red-200 bg-red-50 text-red-700">
      <AlertCircle className="mb-1 h-4 w-4" />
      <AlertTitle>{t('dashboard.dataIncomplete')}</AlertTitle>
      <AlertDescription className="text-red-700">{message}</AlertDescription>
    </Alert>
  );
}

function StatCard({
  locale,
  title,
  description,
  value,
  icon: Icon,
  isLoading,
  isUnavailable
}: {
  locale: string;
  title: string;
  description: string;
  value: number | undefined;
  icon: IconComponent;
  isLoading: boolean;
  isUnavailable?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="rounded-md bg-slate-100 p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight">{isUnavailable ? '—' : formatNumber(locale, value)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function DashboardPage() {
  const auth = useAuth();
  const { locale, t } = useI18n();
  const activeOrg = auth.user?.organizations.find((item) => item.id === auth.activeOrganizationId);
  const canReadUsers = auth.hasPermission('users.read');
  const canReadRoles = auth.hasPermission('roles.read');
  const canReadModules = auth.hasPermission('modules.read');
  const canReadDocuments = auth.hasPermission('documents.read');
  const canReadSystemLogs = auth.hasPermission('systemLogs.read');

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => sdk.users.list({ page: 1, limit: 1 }),
    enabled: canReadUsers
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => sdk.roles.list({ page: 1, limit: 1, includeSystem: true, organizationId: auth.activeOrganizationId ?? undefined }),
    enabled: canReadRoles
  });

  const modulesQuery = useQuery({
    queryKey: queryKeys.modules,
    queryFn: () => sdk.modules.list({ page: 1, limit: 100 }),
    enabled: canReadModules
  });

  const documentsQuery = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => sdk.documents.list({ page: 1, limit: 1 }),
    enabled: canReadDocuments
  });

  const systemLogsQuery = useQuery({
    queryKey: queryKeys.systemLogs,
    queryFn: () => sdk.systemLogs.list({ page: 1, limit: 5 }),
    enabled: canReadSystemLogs
  });

  const criticalLogsQuery = useQuery({
    queryKey: queryKeys.criticalLogs,
    queryFn: () => sdk.systemLogs.list({ page: 1, limit: 1, level: 'ERROR' }),
    enabled: canReadSystemLogs
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => sdk.notifications.unreadCount()
  });

  const queryErrors = [
    [t('navigation.users'), usersQuery],
    [t('navigation.roles'), rolesQuery],
    [t('navigation.modules'), modulesQuery],
    [t('navigation.documents'), documentsQuery],
    [t('navigation.systemLogs'), systemLogsQuery],
    [t('layout.systemStatus'), criticalLogsQuery],
    [t('dashboard.statNotificationsTitle'), unreadNotificationsQuery]
  ] satisfies Array<[string, { isError: boolean; error: unknown }]>;

  const errorMessages = queryErrors
    .filter(([, query]) => query.isError)
    .map(([label, query]) => `${label}: ${getApiErrorMessage(query.error)}`);

  const modules = modulesQuery.isError ? [] : modulesQuery.data?.items ?? [];
  const enabledModules = modules.filter((module) => module.status === 'ENABLED').length;
  const recentLogs = systemLogsQuery.isError ? [] : systemLogsQuery.data?.items ?? [];
  const criticalLogsCount = criticalLogsQuery.isError ? undefined : criticalLogsQuery.data?.meta.total;
  const visibleQuickActions = quickActions.filter((action) => !action.permission || auth.hasPermission(action.permission));
  const isStatsLoading =
    auth.isPermissionsLoading ||
    usersQuery.isLoading ||
    rolesQuery.isLoading ||
    modulesQuery.isLoading ||
    documentsQuery.isLoading ||
    unreadNotificationsQuery.isLoading;
  const hasCriticalLogs = Boolean(criticalLogsCount && criticalLogsCount > 0);
  const criticalStatus = !canReadSystemLogs
    ? null
    : criticalLogsQuery.isError
      ? 'unknown'
      : hasCriticalLogs
        ? 'needsAttention'
        : 'operational';
  const criticalStatusLabel = criticalStatus ? getDashboardStatusLabel(t, criticalStatus) : t('common.accessDenied');

  const stats: Array<{
    title: string;
    description: string;
    value: number | undefined;
    icon: IconComponent;
    query: DashboardQueryKey;
    unavailable?: boolean;
  }> = [
    {
      title: t('dashboard.statUsersTitle'),
      description: t('dashboard.statUsersDescription'),
      value: usersQuery.data?.meta.total,
      icon: Users,
      query: 'users',
      unavailable: !canReadUsers
    },
    {
      title: t('dashboard.statRolesTitle'),
      description: activeOrg ? activeOrg.name : t('dashboard.currentOrganization'),
      value: rolesQuery.data?.meta.total,
      icon: ShieldCheck,
      query: 'roles',
      unavailable: !canReadRoles
    },
    {
      title: t('dashboard.statModulesTitle'),
      description: `${formatNumber(locale, enabledModules)} ${t('modules.status.enabled').toLowerCase()}`,
      value: modulesQuery.data?.meta.total,
      icon: Layers3,
      query: 'modules',
      unavailable: !canReadModules
    },
    {
      title: t('dashboard.statDocumentsTitle'),
      description: t('dashboard.statDocumentsDescription'),
      value: documentsQuery.data?.meta.total,
      icon: FileText,
      query: 'documents',
      unavailable: !canReadDocuments
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">{import.meta.env.VITE_APP_NAME || 'Project Kit'}</h2>
          <p className="text-sm text-muted-foreground">
            {activeOrg ? `${activeOrg.name} ${t('dashboard.description').toLowerCase()}` : t('dashboard.description')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{auth.user?.name ?? auth.user?.email ?? t('common.notSet')}</span>
        </div>
      </div>

      {errorMessages.length ? <DashboardAlert message={errorMessages.join(' ')} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            locale={locale}
            title={stat.title}
            description={stat.unavailable ? t('common.accessDenied') : stat.description}
            value={stat.value}
            icon={stat.icon}
            isLoading={isStatsLoading}
            isUnavailable={stat.unavailable}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>{t('dashboard.recentSystemLogs')}</CardTitle>
            <CardDescription>{t('dashboard.recentSystemLogsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {systemLogsQuery.isLoading ? <SectionSkeleton /> : null}

            {!systemLogsQuery.isLoading && !canReadSystemLogs ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">{t('common.noPermissionToViewPage')}</div>
            ) : null}

            {!systemLogsQuery.isLoading && canReadSystemLogs && !recentLogs.length && !systemLogsQuery.isError ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">{t('common.noDataAvailableYet')}</div>
            ) : null}

            {!systemLogsQuery.isLoading && recentLogs.length ? (
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                    <div className="mt-0.5 rounded-md bg-slate-100 p-2 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getLevelClass(log.level)}>{log.level}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(locale, log.createdAt)}</span>
                      </div>
                      <p className="truncate text-sm font-medium text-foreground">{log.message}</p>
                      <p className="text-xs text-muted-foreground">{log.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.criticalStatus')}</CardTitle>
              <CardDescription>{t('dashboard.criticalStatusDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {criticalLogsQuery.isLoading || modulesQuery.isLoading ? (
                <SectionSkeleton />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'rounded-md p-2',
                          hasCriticalLogs ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        )}
                      >
                        {hasCriticalLogs ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{criticalStatusLabel}</div>
                        <div className="text-sm text-muted-foreground">
                          {!canReadSystemLogs
                            ? t('common.noPermissionToViewPage')
                            : criticalLogsQuery.isError
                              ? t('dashboard.status.unknown')
                              : `${formatNumber(locale, criticalLogsCount)} ${t('dashboard.statCriticalLogsDescription').toLowerCase()}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">{t('modules.status.enabled')}</span>
                      <span className="font-medium">{canReadModules ? formatNumber(locale, enabledModules) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">{t('dashboard.statNotificationsTitle')}</span>
                      <span className="font-medium">{formatNumber(locale, unreadNotificationsQuery.data?.count)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">{t('dashboard.activeOrganization')}</span>
                      <span className="max-w-44 truncate font-medium">{activeOrg?.name ?? t('common.none')}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
              <CardDescription>{t('dashboard.quickActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {visibleQuickActions.length ? (
                visibleQuickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.href}
                      to={action.href}
                      className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm transition hover:bg-muted/40"
                    >
                      <div className="rounded-md bg-slate-100 p-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{t(action.titleKey)}</div>
                        <div className="truncate text-xs text-muted-foreground">{t(action.descriptionKey)}</div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">{t('common.noPermissionToViewPage')}</div>
              )}
              <Link
                to="/notifications"
                className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm transition hover:bg-muted/40"
              >
                <div className="rounded-md bg-slate-100 p-2 text-muted-foreground">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{t('dashboard.statNotificationsTitle')}</div>
                  <div className="truncate text-xs text-muted-foreground">{t('dashboard.viewAllNotifications')}</div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
