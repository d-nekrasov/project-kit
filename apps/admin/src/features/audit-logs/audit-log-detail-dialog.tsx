import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditActionBadge } from '@/features/audit-logs/audit-action-badge';
import type { AuditLogDetailDialogProps } from '@/features/audit-logs/audit-logs-page.types';
import { JsonMetadataView } from '@/features/audit-logs/json-metadata-view';
import { useI18n } from '@/lib/i18n/use-i18n';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-xs text-foreground">{value || '—'}</span>
    </div>
  );
}

export function AuditLogDetailDialog({ open, log, isLoading, error, onOpenChange }: AuditLogDetailDialogProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="fixed inset-y-0 right-0 z-[var(--z-sheet)] w-full max-w-3xl overflow-y-auto border-l bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{t('logs.audit.detailTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('logs.audit.detailDescription')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
        {error ? (
          <Alert className="border-red-200 bg-red-50">
            <AlertTitle className="text-red-700">{t('logs.audit.failedToLoadDetails')}</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !error && log ? (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('modules.manifestDialog.sections.general')}</h3>
              <DetailRow label="ID" value={log.id} />
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-muted-foreground">{t('logs.audit.fields.action')}</span>
                <span>
                  <AuditActionBadge action={log.action} />
                </span>
              </div>
              <DetailRow label={t('common.createdAt')} value={new Date(log.createdAt).toLocaleString()} />
              <DetailRow label={t('logs.audit.fields.entityType')} value={log.entityType} />
              <DetailRow label={t('logs.audit.fields.entityId')} value={log.entityId ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('logs.audit.fields.actor')}</h3>
              <DetailRow label={t('logs.audit.fields.userId')} value={log.user?.id ?? log.userId ?? '—'} />
              <DetailRow label={t('common.name')} value={log.user?.name ?? '—'} />
              <DetailRow label={t('common.email')} value={log.user?.email ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('logs.audit.fields.organization')}</h3>
              <DetailRow label={t('logs.audit.fields.organizationId')} value={log.organization?.id ?? log.organizationId ?? '—'} />
              <DetailRow label={t('common.name')} value={log.organization?.name ?? '—'} />
              <DetailRow label="Slug" value={log.organization?.slug ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('logs.audit.fields.request')}</h3>
              <DetailRow label={t('logs.audit.fields.ip')} value={log.ip ?? '—'} />
              <DetailRow label={t('logs.audit.fields.userAgent')} value={log.userAgent ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('logs.audit.fields.metadata')}</h3>
              <JsonMetadataView value={log.metadata} />
            </section>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
