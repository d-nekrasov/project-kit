import type { NotificationConnectorResponse, NotificationTemplateResponse } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/use-auth';
import { NotificationConnectorDialog } from '@/features/notification-settings/notification-connector-dialog';
import { NotificationConnectorsTable } from '@/features/notification-settings/notification-connectors-table';
import { notificationSettingsQueryKeys } from '@/features/notification-settings/notification-settings-query-keys';
import { NotificationTemplateDialog } from '@/features/notification-settings/notification-template-dialog';
import { NotificationTemplatesTable } from '@/features/notification-settings/notification-templates-table';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

export function NotificationSettingsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<'connectors' | 'templates'>('connectors');
  const [search, setSearch] = useState('');
  const [editingConnector, setEditingConnector] = useState<NotificationConnectorResponse | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateResponse | null>(null);

  const connectorsQuery = useQuery({
    queryKey: notificationSettingsQueryKeys.connectors(),
    queryFn: () => sdk.notificationConnectors.list()
  });

  const templatesQuery = useQuery({
    queryKey: notificationSettingsQueryKeys.templates({ search }),
    queryFn: () => sdk.notificationTemplates.list({ search: search || undefined })
  });

  const updateConnectorMutation = useMutation({
    mutationFn: (values: { status: NotificationConnectorResponse['status']; config?: Record<string, unknown> }) => {
      if (!editingConnector) {
        throw new Error('Connector is not selected');
      }

      return sdk.notificationConnectors.update(editingConnector.code, values);
    },
    onSuccess: async () => {
      setEditingConnector(null);
      await queryClient.invalidateQueries({ queryKey: notificationSettingsQueryKeys.connectors() });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (values: Parameters<typeof sdk.notificationTemplates.upsert>[1]) => {
      if (!editingTemplate) {
        throw new Error('Template is not selected');
      }

      return sdk.notificationTemplates.upsert(editingTemplate.event, values);
    },
    onSuccess: async () => {
      setEditingTemplate(null);
      await queryClient.invalidateQueries({ queryKey: notificationSettingsQueryKeys.all });
    }
  });

  const pageError = connectorsQuery.isError
    ? getApiErrorMessage(connectorsQuery.error)
    : templatesQuery.isError
      ? getApiErrorMessage(templatesQuery.error)
      : null;

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">{t('notificationSettings.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('notificationSettings.description')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeSection === 'connectors' ? 'default' : 'outline'}
          onClick={() => setActiveSection('connectors')}
        >
          {t('notificationSettings.sections.connectors')}
        </Button>
        <Button
          type="button"
          variant={activeSection === 'templates' ? 'default' : 'outline'}
          onClick={() => setActiveSection('templates')}
        >
          {t('notificationSettings.sections.templates')}
        </Button>
      </div>

      {pageError ? <ErrorState message={pageError} /> : null}

      {activeSection === 'connectors' ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('notificationSettings.sections.connectors')}</h3>
            <p className="text-sm text-muted-foreground">{t('notificationSettings.connectors.description')}</p>
          </div>
          <NotificationConnectorsTable
            connectors={connectorsQuery.isError ? [] : connectorsQuery.data ?? []}
            isLoading={connectorsQuery.isLoading}
            onEdit={setEditingConnector}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_320px]">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('notificationSettings.sections.templates')}</h3>
              <p className="text-sm text-muted-foreground">{t('notificationSettings.templates.description')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-template-search">{t('common.search')}</Label>
              <Input
                id="notification-template-search"
                placeholder={t('notificationSettings.templates.searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <NotificationTemplatesTable
            templates={templatesQuery.isError ? [] : templatesQuery.data ?? []}
            isLoading={templatesQuery.isLoading}
            onEdit={setEditingTemplate}
          />
        </section>
      )}

      <NotificationConnectorDialog
        open={Boolean(editingConnector)}
        connector={editingConnector}
        isSubmitting={updateConnectorMutation.isPending}
        error={updateConnectorMutation.isError ? getApiErrorMessage(updateConnectorMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingConnector(null);
          }
        }}
        onSubmit={(values) => updateConnectorMutation.mutate(values)}
      />

      <NotificationTemplateDialog
        open={Boolean(editingTemplate)}
        template={editingTemplate}
        isSubmitting={updateTemplateMutation.isPending}
        error={updateTemplateMutation.isError ? getApiErrorMessage(updateTemplateMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null);
          }
        }}
        onSubmit={(values) => updateTemplateMutation.mutate(values)}
      />
    </div>
  );
}
