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
import { Textarea } from '@/components/ui/textarea';
import type { DocumentFormDialogProps, DocumentFormValues } from '@/features/documents/documents-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(255, 'Title must be at most 255 characters'),
  content: z.string().optional()
});

export function DocumentFormDialog({
  open,
  mode,
  document,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: DocumentFormDialogProps) {
  const { t } = useI18n();
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: ''
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      form.reset({ title: '', content: '' });
      return;
    }

    form.reset({
      title: document?.title ?? '',
      content: document?.content ?? ''
    });
  }, [document, form, mode, open]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create document' : 'Edit document'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new document in the active organization.' : 'Update document title and content.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea rows={8} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.saving')
                  : mode === 'create'
                    ? t('common.createItem', { item: t('entities.document') })
                    : t('common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
