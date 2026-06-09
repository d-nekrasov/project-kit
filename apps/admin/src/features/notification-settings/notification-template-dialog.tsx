import { zodResolver } from '@hookform/resolvers/zod';
import type { NotificationChannel, NotificationTemplateResponse, UpdateNotificationTemplateDto } from '@project-kit/sdk';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/use-i18n';

const editableChannels = ['IN_APP', 'EMAIL'] as const;
const futureChannels = ['SMS', 'MESSENGER', 'WEBHOOK'] as const;

type TemplateFormState = {
  title: string;
  message: string;
  emailSubject?: string;
  emailBody?: string;
  channels: Array<(typeof editableChannels)[number]>;
};

type NotificationTemplateDialogProps = {
  open: boolean;
  template: NotificationTemplateResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: UpdateNotificationTemplateDto) => void;
};

function normalizeChannels(channels: unknown): NotificationChannel[] {
  return Array.isArray(channels) ? (channels as NotificationChannel[]) : [];
}

export function NotificationTemplateDialog({
  open,
  template,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: NotificationTemplateDialogProps) {
  const { t } = useI18n();
  const templateFormSchema = z.object({
    title: z.string().min(1, t('notificationSettings.templates.validation.titleRequired')),
    message: z.string().min(1, t('notificationSettings.templates.validation.messageRequired')),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    channels: z.array(z.enum(editableChannels)).min(1, t('notificationSettings.templates.validation.channelsRequired'))
  });
  const form = useForm<TemplateFormState>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: '',
      message: '',
      emailSubject: '',
      emailBody: '',
      channels: ['IN_APP']
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const channels = normalizeChannels(template?.channels).filter((channel): channel is (typeof editableChannels)[number] =>
      editableChannels.includes(channel as (typeof editableChannels)[number])
    );

    form.reset({
      title: template?.title ?? '',
      message: template?.message ?? '',
      emailSubject: template?.emailSubject ?? '',
      emailBody: template?.emailBody ?? '',
      channels: channels.length ? channels : ['IN_APP']
    });
  }, [form, open, template]);

  const channels = form.watch('channels');

  const submitHandler = (values: TemplateFormState) => {
    onSubmit({
      title: values.title,
      message: values.message,
      emailSubject: values.emailSubject?.trim() ? values.emailSubject : null,
      emailBody: values.emailBody?.trim() ? values.emailBody : null,
      channels: values.channels
    });
  };

  const toggleChannel = (channel: (typeof editableChannels)[number], checked: boolean) => {
    const nextChannels = checked
      ? Array.from(new Set([...channels, channel]))
      : channels.filter((item) => item !== channel);

    form.setValue('channels', nextChannels, { shouldValidate: true });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('notificationSettings.templates.dialog.title')}</DialogTitle>
          <DialogDescription>{template?.event ?? t('notificationSettings.templates.dialog.fallback')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submitHandler)}>
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>{t('common.requestFailed')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

            <FormItem>
              <FormLabel>{t('notificationSettings.templates.fields.event')}</FormLabel>
              <Input value={template?.event ?? ''} disabled />
            </FormItem>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notificationSettings.templates.fields.title')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notificationSettings.templates.fields.message')}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="emailSubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notificationSettings.templates.fields.emailSubject')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailBody"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t('notificationSettings.templates.fields.emailBody')}</FormLabel>
                    <FormControl>
                      <Textarea rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="channels"
              render={() => (
                <FormItem>
                  <FormLabel>{t('notificationSettings.templates.fields.channels')}</FormLabel>
                  <div className="flex flex-wrap gap-4 rounded-md border bg-muted/40 p-3">
                    {editableChannels.map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-foreground/80">
                        <Checkbox
                          checked={channels.includes(channel)}
                          onChange={(event) => toggleChannel(channel, event.target.checked)}
                        />
                        {channel === 'IN_APP'
                          ? t('notificationSettings.channels.inApp')
                          : t('notificationSettings.channels.email')}
                      </label>
                    ))}
                    {futureChannels.map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-slate-400">
                        <Checkbox disabled />
                        {t('notificationSettings.channels.future', { channel })}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                  <FormDescription>{t('notificationSettings.templates.placeholdersHelp', { placeholder: '{{key}}' })}</FormDescription>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
