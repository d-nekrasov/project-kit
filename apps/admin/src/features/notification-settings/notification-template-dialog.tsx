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

const editableChannels = ['IN_APP', 'EMAIL'] as const;
const futureChannels = ['SMS', 'MESSENGER', 'WEBHOOK'] as const;

const templateFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  channels: z.array(z.enum(editableChannels)).min(1, 'Select at least one channel')
});

type TemplateFormState = z.infer<typeof templateFormSchema>;

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
          <DialogTitle>Edit notification template</DialogTitle>
          <DialogDescription>{template?.event ?? 'Template'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submitHandler)}>
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

            <FormItem>
              <FormLabel>Event</FormLabel>
              <Input value={template?.event ?? ''} disabled />
            </FormItem>

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
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
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
                    <FormLabel>Email subject</FormLabel>
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
                    <FormLabel>Email body</FormLabel>
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
                  <FormLabel>Channels</FormLabel>
                  <div className="flex flex-wrap gap-4 rounded-md border bg-slate-50 p-3">
                    {editableChannels.map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox
                          checked={channels.includes(channel)}
                          onChange={(event) => toggleChannel(channel, event.target.checked)}
                        />
                        {channel}
                      </label>
                    ))}
                    {futureChannels.map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-slate-400">
                        <Checkbox disabled />
                        {channel} future
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                  <FormDescription>Placeholders use {'{{key}}'} syntax and are rendered from notification payload.</FormDescription>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
