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
          <DialogTitle>Change document status</DialogTitle>
          <DialogDescription>
            Update status for <span className="font-medium">{document?.title}</span>.
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
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTitle>Archive behavior</AlertTitle>
            <AlertDescription>ARCHIVED is used instead of hard delete to keep document history.</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="document-status">Status</Label>
            <Select id="document-status" value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus)}>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
