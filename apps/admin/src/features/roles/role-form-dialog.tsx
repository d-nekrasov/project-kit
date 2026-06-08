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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { RoleFormDialogProps, RoleFormValues } from '@/features/roles/roles-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

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
  const { t } = useI18n();
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          {errorMessage ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

            {mode === 'create' ? (
              <FormItem>
                <FormLabel>Organization</FormLabel>
                <Input value={organizationName ?? 'Select organization'} disabled />
              </FormItem>
            ) : null}

            {mode === 'create' ? (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="documents_manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <Input value={role?.code ?? ''} disabled />
              </FormItem>
            )}

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || isSubmitDisabled}>
                {isSubmitting
                  ? t('common.saving')
                  : mode === 'create'
                    ? t('common.createItem', { item: t('entities.role') })
                    : t('common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
