import type { ModuleAdminMenuItem } from '@project-kit/sdk';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ModuleStatusBadge } from '@/features/modules/module-status-badge';
import type { ModuleManifestDialogProps } from '@/features/modules/modules-page.types';

function renderJsonBlock(value: unknown) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function renderEmpty(text: string) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function renderAdminMenu(items: ModuleAdminMenuItem[] | undefined) {
  if (!items?.length) {
    return renderEmpty('No admin menu items in manifest.');
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.path}-${index}`} className="rounded-md border p-3 text-sm">
          <div>
            <span className="font-medium">Label:</span> {item.label}
          </div>
          <div>
            <span className="font-medium">Path:</span> <span className="font-mono text-xs">{item.path}</span>
          </div>
          <div>
            <span className="font-medium">Permission:</span> {item.permission ?? '—'}
          </div>
          <div>
            <span className="font-medium">Icon:</span> {item.icon ?? '—'}
          </div>
          <div>
            <span className="font-medium">Order:</span> {item.order ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModuleManifestDialog({ open, module, onOpenChange }: ModuleManifestDialogProps) {
  const manifest = module?.manifest;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Module manifest</DialogTitle>
          <DialogDescription>
            Inspect module metadata for <span className="font-medium">{module?.title ?? module?.name ?? '-'}</span>.
          </DialogDescription>
        </DialogHeader>

        {module ? (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Overview</h3>
              <div className="grid gap-1 text-sm text-foreground/80 md:grid-cols-2">
                <div>
                  <span className="font-medium">name:</span> <span className="font-mono text-xs">{module.name}</span>
                </div>
                <div>
                  <span className="font-medium">title:</span> {manifest?.title ?? module.title}
                </div>
                <div>
                  <span className="font-medium">version:</span> {manifest?.version ?? module.version}
                </div>
                <div>
                  <span className="font-medium">status:</span> <ModuleStatusBadge status={module.status} />
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">description:</span> {manifest?.description ?? module.description ?? '—'}
                </div>
              </div>
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Permissions</h3>
              {manifest?.permissions?.length ? (
                <ul className="space-y-1 text-sm">
                  {manifest.permissions.map((code) => (
                    <li key={code} className="font-mono text-xs text-foreground/80">
                      {code}
                    </li>
                  ))}
                </ul>
              ) : (
                renderEmpty('No permissions in manifest.')
              )}
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Admin menu</h3>
              {renderAdminMenu(manifest?.adminMenu)}
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Settings schema</h3>
              {manifest?.settingsSchema ? renderJsonBlock(manifest.settingsSchema) : renderEmpty('No settings schema in manifest.')}
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Raw manifest</h3>
              {manifest ? renderJsonBlock(manifest) : renderEmpty('Manifest is empty.')}
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Module is not selected.</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
