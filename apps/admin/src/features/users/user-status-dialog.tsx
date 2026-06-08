import type { UserStatus } from '@project-kit/sdk';
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
import type { UserStatusDialogProps } from '@/features/users/users-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function UserStatusDialog({
  open,
  user,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit
}: UserStatusDialogProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<UserStatus>('ACTIVE');

  useEffect(() => {
    if (user?.status) {
      setStatus(user.status);
    }
  }, [user]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change user status</AlertDialogTitle>
          <AlertDialogDescription>
            Update login access for <span className="font-medium">{user?.name ?? user?.email}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(status);
          }}
        >
          {errorMessage ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTitle>Access impact</AlertTitle>
            <AlertDescription>Inactive or blocked users will not be able to sign in.</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(event) => setStatus(event.target.value as UserStatus)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update status'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
