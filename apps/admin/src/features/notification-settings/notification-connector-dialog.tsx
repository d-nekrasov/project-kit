import { zodResolver } from '@hookform/resolvers/zod';
import type { NotificationConnectorResponse, NotificationConnectorStatus } from '@project-kit/sdk';
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
import { Select } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/use-i18n';

type ConnectorFormState = {
  status: 'ENABLED' | 'DISABLED';
  host?: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from?: string;
};

type NotificationConnectorDialogProps = {
  open: boolean;
  connector: NotificationConnectorResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { status: NotificationConnectorStatus; config?: Record<string, unknown> }) => void;
};

function configString(connector: NotificationConnectorResponse | null, key: string) {
  const value = connector?.config?.[key];
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function configNumber(connector: NotificationConnectorResponse | null, key: string, fallback: number) {
  const value = connector?.config?.[key];
  return typeof value === 'number' ? value : fallback;
}

function configBoolean(connector: NotificationConnectorResponse | null, key: string, fallback: boolean) {
  const value = connector?.config?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function NotificationConnectorDialog({
  open,
  connector,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: NotificationConnectorDialogProps) {
  const { t } = useI18n();
  const connectorFormSchema = z
    .object({
      status: z.enum(['ENABLED', 'DISABLED']),
      host: z.string().optional(),
      port: z.number().int().min(1).max(65535),
      secure: z.boolean(),
      username: z.string().optional(),
      password: z.string().optional(),
      from: z.string().optional()
    })
    .superRefine((values, ctx) => {
      if (values.status === 'ENABLED' && !values.host?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['host'],
          message: t('notificationSettings.connectors.validation.hostRequired')
        });
      }

      if (values.status === 'ENABLED' && !values.from?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['from'],
          message: t('notificationSettings.connectors.validation.fromRequired')
        });
      }
    });
  const form = useForm<ConnectorFormState>({
    resolver: zodResolver(connectorFormSchema),
    defaultValues: {
      status: 'DISABLED',
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      from: ''
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      status: connector?.status ?? 'DISABLED',
      host: configString(connector, 'host'),
      port: configNumber(connector, 'port', 587),
      secure: configBoolean(connector, 'secure', false),
      username: configString(connector, 'username'),
      password: configString(connector, 'password'),
      from: configString(connector, 'from')
    });
  }, [connector, form, open]);

  const isSmtp = connector?.code === 'smtp_email';

  const submitHandler = (values: ConnectorFormState) => {
    if (!isSmtp) {
      onSubmit({ status: values.status });
      return;
    }

    onSubmit({
      status: values.status,
      config: {
        host: values.host?.trim() ?? '',
        port: values.port,
        secure: values.secure,
        username: values.username?.trim() ?? '',
        password: values.password ?? '',
        from: values.from?.trim() ?? ''
      }
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('notificationSettings.connectors.dialog.title')}</DialogTitle>
          <DialogDescription>{connector?.code ?? t('notificationSettings.connectors.dialog.fallback')}</DialogDescription>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.status')}</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="ENABLED">{t('modules.status.enabled')}</option>
                      <option value="DISABLED">{t('modules.status.disabled')}</option>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSmtp ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notificationSettings.connectors.fields.host')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="smtp.example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notificationSettings.connectors.fields.port')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onChange={(event) => field.onChange(event.target.checked)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormLabel>{t('notificationSettings.connectors.fields.secure')}</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notificationSettings.connectors.fields.from')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Project Kit <noreply@example.com>" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notificationSettings.connectors.fields.username')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notificationSettings.connectors.fields.password')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>{t('notificationSettings.connectors.passwordHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                {t('notificationSettings.connectors.readOnlyConfig')}
              </p>
            )}

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
