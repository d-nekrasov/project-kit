import type { ModuleStatus } from '@project-kit/sdk';
import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { ModuleStatusDialogProps } from '@/features/modules/modules-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { translateWithFallback } from '@/lib/i18n/translate-with-fallback';

export function ModuleStatusDialog({
  open,
  module,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: ModuleStatusDialogProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<ModuleStatus>('ENABLED');

  useEffect(() => {
    if (module?.status) {
      setStatus(module.status);
    }
  }, [module]);

  const isCoreModule = module?.name === 'core';
  const moduleTitle = module ? translateWithFallback(t, module.manifest?.titleKey, module.title) : '-';
  const submitDisabled = useMemo(() => isSubmitting || isCoreModule, [isCoreModule, isSubmitting]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('modulesPage.statusDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('modulesPage.statusDialog.description', { name: moduleTitle || module?.name || '-' })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!submitDisabled) {
              onSubmit(status);
            }
          }}
        >
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertTitle>{t('common.requestFailed')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTitle>{t('modulesPage.statusDialog.impactTitle')}</AlertTitle>
            <AlertDescription>{t('modulesPage.statusDialog.impactDescription')}</AlertDescription>
          </Alert>

          {isCoreModule ? (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800">
              <AlertTitle>{t('modulesPage.statusDialog.coreProtectionTitle')}</AlertTitle>
              <AlertDescription>{t('modulesPage.statusDialog.coreProtectionDescription')}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="module-status">{t('common.status')}</Label>
            <Select
              id="module-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ModuleStatus)}
              disabled={isCoreModule}
            >
              <option value="ENABLED">{t('modulesPage.status.enabled')}</option>
              <option value="DISABLED">{t('modulesPage.status.disabled')}</option>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isSubmitting ? t('common.updating') : t('modulesPage.statusDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
