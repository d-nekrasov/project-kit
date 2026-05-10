import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuditActionBadge } from '@/features/audit-logs/audit-action-badge';
import type { AuditLogDetailDialogProps } from '@/features/audit-logs/audit-logs-page.types';
import { JsonMetadataView } from '@/features/audit-logs/json-metadata-view';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
      <span className="text-slate-500">{label}</span>
      <span className="break-all font-mono text-xs text-slate-800">{value || '—'}</span>
    </div>
  );
}

export function AuditLogDetailDialog({ open, log, isLoading, error, onOpenChange }: AuditLogDetailDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Audit log details</DialogTitle>
          <DialogDescription>Detailed view for selected audit event.</DialogDescription>
        </DialogHeader>

        {isLoading ? <p className="text-sm text-slate-500">Loading details...</p> : null}
        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!isLoading && !error && log ? (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Overview</h3>
              <DetailRow label="ID" value={log.id} />
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-slate-500">Action</span>
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

