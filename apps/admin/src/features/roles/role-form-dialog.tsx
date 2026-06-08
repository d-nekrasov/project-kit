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
  const createSchema = z.object({
    code: z
      .string()
      .min(2, t('roles.form.validation.codeMin'))
      .regex(/^[a-z0-9_-]+$/, t('roles.form.validation.codeFormat')),
    name: z.string().min(2, t('roles.form.validation.nameMin'))
  });
  const editSchema = z.object({
    name: z.string().min(2, t('roles.form.validation.nameMin'))
  });
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
          <DialogTitle>{mode === 'create' ? t('roles.form.createTitle') : t('roles.form.editTitle')}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? t('roles.form.createDescription') : t('roles.form.editDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          {errorMessage ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>{t('common.requestFailed')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

            {mode === 'create' ? (
              <FormItem>
                <FormLabel>{t('roles.toolbar.organization')}</FormLabel>
                <Input value={organizationName ?? t('roles.form.organizationFallback')} disabled />
              </FormItem>
            ) : null}

            {mode === 'create' ? (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roles.fields.code')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('roles.form.codePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>{t('roles.fields.code')}</FormLabel>
                <Input value={role?.code ?? ''} disabled />
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.name')}</FormLabel>
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
