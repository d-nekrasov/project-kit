import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { UserFormDialogProps, UserFormValues } from '@/features/users/users-page.types';

const createSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
  organizationId: z.string().optional()
});

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  roleId: z.string().min(1, 'Role is required')
});

function findDefaultRoleId(user: UserFormDialogProps['user'], activeOrganizationId: string | null | undefined): string {
  if (!user) {
    return '';
  }

  const membership = activeOrganizationId
    ? user.organizations.find((organization) => organization.id === activeOrganizationId)
    : user.organizations[0];
  return membership?.roleId ?? '';
}

export function UserFormDialog({
  open,
  mode,
  user,
  roles,
  organizations = [],
  isSuperAdmin = false,
  activeOrganizationId,
  onOrganizationChange,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit
}: UserFormDialogProps) {
  const defaultRoleId = useMemo(() => findDefaultRoleId(user, activeOrganizationId), [activeOrganizationId, user]);
  const schema = mode === 'create' ? createSchema : editSchema;
  const initKeyRef = useRef<string>('');

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      roleId: '',
      organizationId: activeOrganizationId ?? ''
    }
  });

  useEffect(() => {
    if (!open) {
      initKeyRef.current = '';
      return;
    }

    if (mode === 'create') {
      const organizationId = isSuperAdmin ? organizations[0]?.id ?? activeOrganizationId ?? '' : activeOrganizationId ?? '';
      const nextInitKey = `create:${organizationId}:${roles[0]?.id ?? ''}:${organizations.length}`;
      if (initKeyRef.current === nextInitKey) {
        return;
      }
      initKeyRef.current = nextInitKey;

      form.reset({
        email: '',
        name: '',
        password: '',
        roleId: roles[0]?.id ?? '',
        organizationId
      });
      if (organizationId && organizationId !== activeOrganizationId) {
        onOrganizationChange?.(organizationId);
      }
      return;
    }

    const nextInitKey = `edit:${user?.id ?? ''}:${defaultRoleId}`;
    if (initKeyRef.current === nextInitKey) {
      return;
    }
    initKeyRef.current = nextInitKey;

    form.reset({
      name: user?.name ?? '',
      roleId: defaultRoleId
    });
  }, [activeOrganizationId, defaultRoleId, form, isSuperAdmin, mode, onOrganizationChange, open, organizations, user]);

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

        <Form {...form}>
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {mode === 'create' && isSuperAdmin ? (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          onOrganizationChange?.(event.target.value);
                          form.setValue('roleId', '');
                        }}
                      >
                        <option value="">Select organization</option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'create' ? (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create user' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
