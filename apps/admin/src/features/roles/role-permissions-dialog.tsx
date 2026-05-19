import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
            <Alert className="border-input bg-muted/40 text-foreground/80">
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

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground/80">
            {selectedPermissions.length} permissions selected
          </div>

          <div className="max-h-[420px] space-y-4 overflow-auto pr-1">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading permissions...</div>
            ) : (
              permissionGroups.map((group) => {
                const moduleCodes = group.permissions.map((permission) => permission.code);
                const byResource = group.permissions.reduce<Record<string, typeof group.permissions>>((acc, permission) => {
                  const key = permission.resource || 'Other';
                  if (!acc[key]) {
                    acc[key] = [];
                  }
                  acc[key].push(permission);
                  return acc;
                }, {});

                return (
                  <div key={group.module} className="rounded-md border p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{group.module}</h4>
                        <p className="text-xs text-muted-foreground">{group.permissions.length} permissions</p>
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

                    <div className="space-y-3">
                      {Object.entries(byResource).map(([resource, permissions]) => (
                        <div key={`${group.module}-${resource}`} className="rounded border border-border p-2">
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{resource}</div>
                          <div className="space-y-2">
                            {permissions.map((permission) => (
                              <label key={permission.code} className="flex items-start gap-2 rounded px-1 py-1 text-sm">
                                <Checkbox
                                  className="mt-0.5"
                                  checked={selectedSet.has(permission.code)}
                                  disabled={isReadonly}
                                  onChange={(event) => togglePermission(permission.code, event.target.checked)}
                                />
                                <span className="space-y-1">
                                  <Badge className="font-mono">{permission.code}</Badge>
                                  <span className="block text-xs text-muted-foreground">{permission.description || 'No description'}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {!isLoading && !permissionGroups.length ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">No permissions available for this organization.</CardContent>
            </Card>
          ) : null}
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
