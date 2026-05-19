import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditActionBadge } from '@/features/audit-logs/audit-action-badge';
import type { AuditLogDetailDialogProps } from '@/features/audit-logs/audit-logs-page.types';
import { JsonMetadataView } from '@/features/audit-logs/json-metadata-view';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-xs text-foreground">{value || '—'}</span>
    </div>
  );
}

export function AuditLogDetailDialog({ open, log, isLoading, error, onOpenChange }: AuditLogDetailDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto border-l bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Audit log details</h3>
            <p className="text-sm text-muted-foreground">Detailed view for selected audit event.</p>
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
            <AlertTitle className="text-red-700">Failed to load details</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !error && log ? (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Overview</h3>
              <DetailRow label="ID" value={log.id} />
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-muted-foreground">Action</span>
                <span>
                  <AuditActionBadge action={log.action} />
                </span>
              </div>
              <DetailRow label="Created at" value={new Date(log.createdAt).toLocaleString()} />
              <DetailRow label="Entity type" value={log.entityType} />
              <DetailRow label="Entity ID" value={log.entityId ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Actor</h3>
              <DetailRow label="User ID" value={log.user?.id ?? log.userId ?? '—'} />
              <DetailRow label="Name" value={log.user?.name ?? '—'} />
              <DetailRow label="Email" value={log.user?.email ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Organization</h3>
              <DetailRow label="Organization ID" value={log.organization?.id ?? log.organizationId ?? '—'} />
              <DetailRow label="Name" value={log.organization?.name ?? '—'} />
              <DetailRow label="Slug" value={log.organization?.slug ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Request</h3>
              <DetailRow label="IP" value={log.ip ?? '—'} />
              <DetailRow label="User agent" value={log.userAgent ?? '—'} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Metadata</h3>
              <JsonMetadataView value={log.metadata} />
            </section>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
