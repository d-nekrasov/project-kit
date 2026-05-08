import type { OrganizationStatus } from '@project-kit/sdk';
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
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change organization status</DialogTitle>
          <DialogDescription>
            Update status for <span className="font-medium">{organization?.name ?? '-'}</span> ({organization?.slug ?? '-'})
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
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
