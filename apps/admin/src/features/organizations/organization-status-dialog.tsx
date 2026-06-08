import type { OrganizationStatus } from '@project-kit/sdk';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { OrganizationStatusDialogProps } from '@/features/organizations/organizations-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function OrganizationStatusDialog({
  open,
  organization,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: OrganizationStatusDialogProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<OrganizationStatus>('ACTIVE');

  useEffect(() => {
    if (organization?.status) {
      setStatus(organization.status);
    }
  }, [organization]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('organizations.statusDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('organizations.statusDialog.description', { name: organization?.name ?? '-', slug: organization?.slug ?? '-' })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(status);
          }}
        >
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertTitle>{t('common.requestFailed')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTitle>{t('organizations.statusDialog.impactTitle')}</AlertTitle>
            <AlertDescription>{t('organizations.statusDialog.impactDescription')}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="organization-status">{t('common.status')}</Label>
            <Select
              id="organization-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrganizationStatus)}
            >
              <option value="ACTIVE">{t('organizations.status.active')}</option>
              <option value="INACTIVE">{t('organizations.status.inactive')}</option>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.updating') : t('organizations.statusDialog.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
