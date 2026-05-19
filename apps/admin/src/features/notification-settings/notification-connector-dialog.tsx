import { zodResolver } from '@hookform/resolvers/zod';
import type { NotificationConnectorResponse, NotificationConnectorStatus } from '@project-kit/sdk';
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
import { Select } from '@/components/ui/select';

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
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['host'], message: 'Host is required when SMTP is enabled' });
    }

    if (values.status === 'ENABLED' && !values.from?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'From is required when SMTP is enabled' });
    }
  });

type ConnectorFormState = z.infer<typeof connectorFormSchema>;

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
          <DialogTitle>Edit notification connector</DialogTitle>
          <DialogDescription>{connector?.code ?? 'Connector'}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submitHandler)}>
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="connector-status">Status</Label>
            <Select id="connector-status" {...form.register('status')}>
              <option value="ENABLED">ENABLED</option>
              <option value="DISABLED">DISABLED</option>
            </Select>
            <p className="text-xs text-red-600">{form.formState.errors.status?.message}</p>
          </div>

          {isSmtp ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="connector-host">Host</Label>
                <Input id="connector-host" {...form.register('host')} placeholder="smtp.example.com" />
                <p className="text-xs text-red-600">{form.formState.errors.host?.message}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="connector-port">Port</Label>
                <Input id="connector-port" type="number" {...form.register('port', { valueAsNumber: true })} />
                <p className="text-xs text-red-600">{form.formState.errors.port?.message}</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...form.register('secure')} />
                secure
              </label>

              <div className="space-y-2">
                <Label htmlFor="connector-from">From</Label>
                <Input id="connector-from" {...form.register('from')} placeholder="Project Kit <noreply@example.com>" />
                <p className="text-xs text-red-600">{form.formState.errors.from?.message}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="connector-username">Username</Label>
                <Input id="connector-username" {...form.register('username')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="connector-password">Password</Label>
                <Input id="connector-password" type="password" {...form.register('password')} />
                <p className="text-xs text-slate-500">Leave password unchanged to keep the current value.</p>
              </div>
            </div>
          ) : (
            <p className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
              This connector does not expose editable configuration.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
