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

export function ModuleStatusDialog({
  open,
  module,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: ModuleStatusDialogProps) {
  const [status, setStatus] = useState<ModuleStatus>('ENABLED');

  useEffect(() => {
    if (module?.status) {
      setStatus(module.status);
    }
  }, [module]);

  const isCoreModule = module?.name === 'core';
  const submitDisabled = useMemo(() => isSubmitting || isCoreModule, [isCoreModule, isSubmitting]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change module status</DialogTitle>
          <DialogDescription>
            Update status for <span className="font-medium">{module?.title ?? module?.name ?? '-'}</span>.
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
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTitle>Impact notice</AlertTitle>
            <AlertDescription>
              Disabling a module does not delete data. Permissions and settings remain. Endpoints protected by
              ModuleEnabledGuard return 403, and related menu items should be hidden in UI.
            </AlertDescription>
          </Alert>

          {isCoreModule ? (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800">
              <AlertTitle>Core protection</AlertTitle>
              <AlertDescription>The core module cannot be disabled.</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="module-status">Status</Label>
            <Select
              id="module-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ModuleStatus)}
              disabled={isCoreModule}
            >
              <option value="ENABLED">ENABLED</option>
              <option value="DISABLED">DISABLED</option>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isSubmitting ? 'Updating...' : 'Update status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
