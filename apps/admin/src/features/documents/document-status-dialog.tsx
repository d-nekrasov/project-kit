import type { DocumentStatus } from '@project-kit/sdk';
import { useEffect, useState } from 'react';

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
import type { DocumentStatusDialogProps } from '@/features/documents/documents-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function DocumentStatusDialog({
  open,
  document,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: DocumentStatusDialogProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<DocumentStatus>('DRAFT');

  useEffect(() => {
    if (document?.status) {
      setStatus(document.status);
    }
  }, [document]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('documents.dialogs.status.title')}</DialogTitle>
          <DialogDescription>
            {t('documents.dialogs.status.description', { title: document?.title ?? '' })}
          </DialogDescription>
        </DialogHeader>

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
            <AlertTitle>{t('documents.dialogs.status.archiveTitle')}</AlertTitle>
            <AlertDescription>{t('documents.dialogs.status.archiveDescription')}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="document-status">{t('common.status')}</Label>
            <Select id="document-status" value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus)}>
              <option value="DRAFT">{t('documents.status.draft')}</option>
              <option value="PUBLISHED">{t('documents.status.published')}</option>
              <option value="ARCHIVED">{t('documents.status.archived')}</option>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.updating') : t('documents.dialogs.status.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
