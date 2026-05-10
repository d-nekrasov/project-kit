import { JsonViewer } from '@/components/common/json-viewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SystemLogLevelBadge } from '@/features/system-logs/system-log-level-badge';
import { SystemLogSourceBadge } from '@/features/system-logs/system-log-source-badge';
import type { SystemLogDetailDialogProps } from '@/features/system-logs/system-logs-page.types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
      <span className="text-slate-500">{label}</span>
      <span className="break-all font-mono text-xs text-slate-800">{value || '—'}</span>
    </div>
  );
}

export function SystemLogDetailDialog({ open, log, isLoading, error, onOpenChange }: SystemLogDetailDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>System log details</DialogTitle>
          <DialogDescription>Detailed view for selected technical runtime event.</DialogDescription>
        </DialogHeader>

        {isLoading ? <p className="text-sm text-slate-500">Loading details...</p> : null}
        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!isLoading && !error && log ? (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Overview</h3>
              <DetailRow label="ID" value={log.id} />
              <DetailRow label="Created at" value={new Date(log.createdAt).toLocaleString()} />
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-slate-500">Level</span>
                <span>
                  <SystemLogLevelBadge level={log.level} />
                </span>
              </div>
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-slate-500">Source</span>
                <span>
                  <SystemLogSourceBadge source={log.source} />
                </span>
              </div>
              <DetailRow label="Message" value={log.message} />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">User</h3>
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
              <h3 className="text-sm font-semibold">Context</h3>
              <JsonViewer value={log.context} emptyText="No context." />
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Error stack</h3>
              {log.errorStack ? (
                <pre className="max-h-72 overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
                  {log.errorStack}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">No error stack.</p>
              )}
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
