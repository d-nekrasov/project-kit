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
import { useI18n } from '@/lib/i18n/use-i18n';

export function ModuleSettingsSchemaDialog({ open, module, onOpenChange }: ModuleSettingsSchemaDialogProps) {
  const { t } = useI18n();
  const schema = module?.manifest?.settingsSchema;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('settings.schemaDialog.title')}</DialogTitle>
          <DialogDescription>
            {module ? (
              <>
                <span className="font-medium">{module.title}</span> (<span className="font-mono text-xs">{module.name}</span>)
              </>
            ) : (
              t('settings.schemaDialog.selectModule')
            )}
          </DialogDescription>
        </DialogHeader>

        {module ? (
          schema ? (
            <pre className="max-h-[65vh] overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
              {JSON.stringify(schema, null, 2)}
            </pre>
          ) : (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">{t('settings.schemaDialog.noSchema')}</div>
          )
        ) : (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">{t('settings.schemaDialog.moduleNotSelected')}</div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
