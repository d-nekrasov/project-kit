import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
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
import type { RoleFormDialogProps, RoleFormValues } from '@/features/roles/roles-page.types';

const createSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase latin letters, numbers, _ or -'),
  name: z.string().min(2, 'Name must be at least 2 characters')
});

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters')
});

export function RoleFormDialog({
  open,
  mode,
  role,
  organizationName,
  isSubmitDisabled,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit
}: RoleFormDialogProps) {
  const schema = mode === 'create' ? createSchema : editSchema;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: ''
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      form.reset({ code: '', name: '' });
      return;
    }

    form.reset({ name: role?.name ?? '' });
  }, [form, mode, open, role]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create role' : 'Edit role'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new organization role. Permissions can be configured after creation.'
              : 'Update role display name.'}
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

          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="role-organization-readonly">Organization</Label>
              <Input id="role-organization-readonly" value={organizationName ?? 'Select organization'} disabled />
            </div>
          ) : null}

          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="role-code">Code</Label>
              <Input id="role-code" placeholder="documents_manager" {...form.register('code')} />
              <p className="text-xs text-red-600">{form.formState.errors.code?.message}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="role-code-readonly">Code</Label>
              <Input id="role-code-readonly" value={role?.code ?? ''} disabled />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" {...form.register('name')} />
            <p className="text-xs text-red-600">{form.formState.errors.name?.message}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isSubmitDisabled}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create role' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
