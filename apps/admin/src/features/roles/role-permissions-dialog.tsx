import { AlertCircle } from 'lucide-react';
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
import type { RolePermissionsDialogProps } from '@/features/roles/roles-page.types';

function isPermissionsReadonly(roleCode?: string) {
  return roleCode === 'organization_admin';
}

export function RolePermissionsDialog({
  open,
  role,
  organizationName,
  permissionGroups,
  isLoading,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit
}: RolePermissionsDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !role) {
      return;
    }

    setSelectedPermissions(role.permissions.map((permission) => permission.code));
  }, [open, role]);

  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
  const isSystem = role?.type === 'SYSTEM';
  const isProtected = isPermissionsReadonly(role?.code);
  const isReadonly = isSystem || isProtected;

  const togglePermission = (code: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      const set = new Set(prev);
      if (checked) {
        set.add(code);
      } else {
        set.delete(code);
      }
      return Array.from(set);
    });
  };

  const applyModuleSelection = (moduleCodes: string[], mode: 'all' | 'clear') => {
    setSelectedPermissions((prev) => {
      const set = new Set(prev);

      if (mode === 'all') {
        moduleCodes.forEach((code) => set.add(code));
      } else {
        moduleCodes.forEach((code) => set.delete(code));
      }

      return Array.from(set);
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit permissions: {role?.name ?? '-'}</DialogTitle>
          <DialogDescription>
            Configure role permissions grouped by module.
            {organizationName ? ` Organization: ${organizationName}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {isSystem ? (
            <Alert className="border-slate-300 bg-slate-50 text-slate-700">
              <AlertTitle>Read-only role</AlertTitle>
              <AlertDescription>System roles are read-only.</AlertDescription>
            </Alert>
          ) : null}

          {isProtected ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTitle>Protected role</AlertTitle>
              <AlertDescription>Permissions of organization_admin are protected.</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {selectedPermissions.length} permissions selected
          </div>

          <div className="max-h-[420px] space-y-4 overflow-auto pr-1">
            {isLoading ? (
              <div className="text-sm text-slate-600">Loading permissions...</div>
            ) : !permissionGroups.length ? (
              <div className="text-sm text-slate-600">No permissions available.</div>
            ) : (
              permissionGroups.map((group) => {
                const moduleCodes = group.permissions.map((permission) => permission.code);

                return (
                  <div key={group.module} className="rounded-md border p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{group.module}</h4>
                        <p className="text-xs text-slate-500">{group.permissions.length} permissions</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isReadonly}
                          onClick={() => applyModuleSelection(moduleCodes, 'all')}
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isReadonly}
                          onClick={() => applyModuleSelection(moduleCodes, 'clear')}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {group.permissions.map((permission) => (
                        <label key={permission.code} className="flex items-start gap-2 rounded px-1 py-1 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={selectedSet.has(permission.code)}
                            disabled={isReadonly}
                            onChange={(event) => togglePermission(permission.code, event.target.checked)}
                          />
                          <span>
                            <span className="font-mono text-xs text-slate-800">{permission.code}</span>
                            <span className="block text-xs text-slate-500">{permission.description || 'No description'}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || isReadonly || isLoading}
            onClick={() => onSubmit(selectedPermissions)}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
