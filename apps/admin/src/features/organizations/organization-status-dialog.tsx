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

export function OrganizationStatusDialog({
  open,
  organization,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: OrganizationStatusDialogProps) {
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
          <AlertDialogTitle>Change organization status</AlertDialogTitle>
          <AlertDialogDescription>
            Update status for <span className="font-medium">{organization?.name ?? '-'}</span> ({organization?.slug ?? '-'})
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
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTitle>Impact notice</AlertTitle>
            <AlertDescription>
              Inactive organization cannot be used as active context. Users may lose access to this organization.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="organization-status">Status</Label>
            <Select
              id="organization-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrganizationStatus)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
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
