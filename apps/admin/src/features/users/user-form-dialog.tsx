import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { UserFormDialogProps, UserFormValues } from '@/features/users/users-page.types';

const createSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required')
});

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  roleId: z.string().min(1, 'Role is required')
});

function findDefaultRoleId(user: UserFormDialogProps['user'], roleCodeMap: Map<string, string>): string {
  const roleCode = user?.organizations[0]?.role;
  if (!roleCode) {
    return '';
  }

  return roleCodeMap.get(roleCode) ?? '';
}

export function UserFormDialog({
  open,
  mode,
  user,
  roles,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit
}: UserFormDialogProps) {
  const roleCodeMap = useMemo(() => new Map(roles.map((role) => [role.code, role.id])), [roles]);
  const defaultRoleId = findDefaultRoleId(user, roleCodeMap);
  const schema = mode === 'create' ? createSchema : editSchema;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      roleId: ''
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      form.reset({
        email: '',
        name: '',
        password: '',
        roleId: roles[0]?.id ?? ''
      });
      return;
    }

    form.reset({
      name: user?.name ?? '',
      roleId: defaultRoleId
    });
  }, [defaultRoleId, form, mode, open, roles, user]);

  const roleWarning = mode === 'edit' && !defaultRoleId;

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create user' : 'Edit user'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new user in the active organization.'
              : 'Update user profile and organization role.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          {errorMessage ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {roleWarning ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTitle>Role is not resolved</AlertTitle>
              <AlertDescription>Select a role for this user in the active organization.</AlertDescription>
            </Alert>
          ) : null}

          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" type="email" {...form.register('email')} />
              <p className="text-xs text-red-600">{form.formState.errors.email?.message}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-name">Name</Label>
            <Input id="user-name" {...form.register('name')} />
            <p className="text-xs text-red-600">{form.formState.errors.name?.message}</p>
          </div>

          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="user-password">Password</Label>
              <Input id="user-password" type="password" {...form.register('password')} />
              <p className="text-xs text-red-600">{form.formState.errors.password?.message}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <Select id="user-role" {...form.register('roleId')}>
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-red-600">{form.formState.errors.roleId?.message}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create user' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
