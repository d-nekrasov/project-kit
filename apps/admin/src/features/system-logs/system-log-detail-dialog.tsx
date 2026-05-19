import { JsonViewer } from '@/components/common/json-viewer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { SystemLogLevelBadge } from '@/features/system-logs/system-log-level-badge';
import { SystemLogSourceBadge } from '@/features/system-logs/system-log-source-badge';
import type { SystemLogDetailDialogProps } from '@/features/system-logs/system-logs-page.types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-xs text-foreground">{value || '—'}</span>
    </div>
  );
}

export function SystemLogDetailDialog({ open, log, isLoading, error, onOpenChange }: SystemLogDetailDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl overflow-y-auto border-l bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">System log details</h3>
            <p className="text-sm text-muted-foreground">Detailed view for selected technical runtime event.</p>
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
              <DetailRow label="Created at" value={new Date(log.createdAt).toLocaleString()} />
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-muted-foreground">Level</span>
                <span>
                  <SystemLogLevelBadge level={log.level} />
                </span>
              </div>
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-muted-foreground">Source</span>
                <span>
                  <SystemLogSourceBadge source={log.source} />
                </span>
              </div>
              <div className="grid gap-1 text-sm md:grid-cols-[180px_1fr]">
                <span className="text-muted-foreground">Message</span>
                <p className="whitespace-pre-wrap break-words font-mono text-xs text-foreground">{log.message || '—'}</p>
              </div>
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
                <p className="text-sm text-muted-foreground">No error stack.</p>
              )}
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
