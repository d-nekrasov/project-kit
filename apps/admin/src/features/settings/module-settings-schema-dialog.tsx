import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { ModuleSettingsSchemaDialogProps } from '@/features/settings/settings-page.types';

export function ModuleSettingsSchemaDialog({ open, module, onOpenChange }: ModuleSettingsSchemaDialogProps) {
  const schema = module?.manifest?.settingsSchema;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Module settings schema</DialogTitle>
          <DialogDescription>
            {module ? (
              <>
                <span className="font-medium">{module.title}</span> (<span className="font-mono text-xs">{module.name}</span>)
              </>
            ) : (
              'Select a module to inspect settings schema.'
            )}
          </DialogDescription>
        </DialogHeader>

        {module ? (
          schema ? (
            <pre className="max-h-[65vh] overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
              {JSON.stringify(schema, null, 2)}
            </pre>
          ) : (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">This module manifest has no settings schema.</div>
          )
        ) : (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">Module is not selected.</div>
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
