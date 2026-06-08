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
import { useI18n } from '@/lib/i18n/use-i18n';
import { translateWithFallback } from '@/lib/i18n/translate-with-fallback';

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

function renderAdminMenu(
  items: ModuleAdminMenuItem[] | undefined,
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string
) {
  if (!items?.length) {
    return renderEmpty(t('modules.manifest.emptyAdminMenu'));
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.path}-${index}`} className="rounded-md border p-3 text-sm">
          <div>
            <span className="font-medium">{t('modules.manifest.fields.label')}:</span>{' '}
            {translateWithFallback(t, item.labelKey, item.label)}
          </div>
          <div>
            <span className="font-medium">{t('modules.manifest.fields.path')}:</span>{' '}
            <span className="font-mono text-xs">{item.path}</span>
          </div>
          <div>
            <span className="font-medium">{t('modules.manifest.fields.permission')}:</span> {item.permission ?? '—'}
          </div>
          <div>
            <span className="font-medium">{t('modules.manifest.fields.icon')}:</span> {item.icon ?? '—'}
          </div>
          <div>
            <span className="font-medium">{t('modules.manifest.fields.order')}:</span> {item.order ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModuleManifestDialog({ open, module, onOpenChange }: ModuleManifestDialogProps) {
  const { t } = useI18n();
  const manifest = module?.manifest;
  const moduleTitle = module ? translateWithFallback(t, manifest?.titleKey, module.title) : '-';
  const moduleDescription = module
    ? translateWithFallback(t, manifest?.descriptionKey, module.description ?? manifest?.description ?? '—')
    : '—';

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('modules.manifest.title')}</DialogTitle>
          <DialogDescription>
            {t('modules.manifest.description', { name: moduleTitle || module?.name || '-' })}
          </DialogDescription>
        </DialogHeader>

        {module ? (
          <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('modules.manifest.sections.overview')}</h3>
              <div className="grid gap-1 text-sm text-foreground/80 md:grid-cols-2">
                <div>
                  <span className="font-medium">{t('modules.manifest.overview.name')}:</span>{' '}
                  <span className="font-mono text-xs">{module.name}</span>
                </div>
                <div>
                  <span className="font-medium">{t('modules.manifest.overview.title')}:</span> {moduleTitle}
                </div>
                <div>
                  <span className="font-medium">{t('modules.manifest.overview.version')}:</span> {manifest?.version ?? module.version}
                </div>
                <div>
                  <span className="font-medium">{t('modules.manifest.overview.status')}:</span> <ModuleStatusBadge status={module.status} />
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">{t('modules.manifest.overview.description')}:</span> {moduleDescription}
                </div>
              </div>
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('modules.manifest.sections.permissions')}</h3>
              {manifest?.permissions?.length ? (
                <ul className="space-y-1 text-sm">
                  {manifest.permissions.map((code) => (
                    <li key={code} className="font-mono text-xs text-foreground/80">
                      {code}
                    </li>
                  ))}
                </ul>
              ) : (
                renderEmpty(t('modules.manifest.noPermissions'))
              )}
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('modules.manifest.sections.adminMenu')}</h3>
              {renderAdminMenu(manifest?.adminMenu, t)}
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('modules.manifest.sections.settingsSchema')}</h3>
              {manifest?.settingsSchema ? renderJsonBlock(manifest.settingsSchema) : renderEmpty(t('modules.manifest.noSettingsSchema'))}
            </section>

            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{t('modules.manifest.sections.rawManifest')}</h3>
              {manifest ? renderJsonBlock(manifest) : renderEmpty(t('modules.manifest.emptyManifest'))}
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('modules.manifest.moduleNotSelected')}</p>
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
