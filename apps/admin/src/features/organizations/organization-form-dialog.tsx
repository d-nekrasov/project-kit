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
import type {
  OrganizationFormDialogProps,
  OrganizationFormValues
} from '@/features/organizations/organizations-page.types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase latin letters, numbers and dashes')
});

export function OrganizationFormDialog({
  open,
  mode,
  organization,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: OrganizationFormDialogProps) {
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: ''
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      form.reset({ name: '', slug: '' });
      return;
    }

    form.reset({
      name: organization?.name ?? '',
      slug: organization?.slug ?? ''
    });
  }, [form, mode, open, organization]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create organization' : 'Edit organization'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new organization.' : 'Update organization name and slug.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="organization-name">Name</Label>
            <Input id="organization-name" {...form.register('name')} />
            <p className="text-xs text-red-600">{form.formState.errors.name?.message}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-slug">Slug</Label>
            <Input id="organization-slug" {...form.register('slug')} />
            <p className="text-xs text-red-600">{form.formState.errors.slug?.message}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create organization' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
