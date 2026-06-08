import { zodResolver } from '@hookform/resolvers/zod';
import type { SettingScope } from '@project-kit/sdk';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { JsonValueEditor } from '@/features/settings/json-value-editor';
import type { SettingFormDialogProps, SettingFormDialogSubmitValues } from '@/features/settings/settings-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

const settingFormSchema = z
  .object({
    key: z.string().min(2, 'Key must be at least 2 characters'),
    scope: z.enum(['GLOBAL', 'ORGANIZATION', 'MODULE']),
    module: z.string().optional(),
    organizationSpecific: z.boolean(),
    valueRaw: z.string().min(1, 'Value is required')
  })
  .superRefine((values, ctx) => {
    if (values.scope === 'MODULE' && !values.module) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['module'],
        message: 'Module is required for MODULE scope'
      });
    }

    try {
      JSON.parse(values.valueRaw);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valueRaw'],
        message: 'Value must be valid JSON'
      });
    }
  });

type SettingFormState = z.infer<typeof settingFormSchema>;

function scopeFromSetting(settingScope?: SettingScope) {
  return settingScope ?? 'ORGANIZATION';
}

export function SettingFormDialog({
  open,
  mode,
  setting,
  modules,
  isSuperAdmin,
  isSubmitting,
  error,
  onOpenChange,
  onSubmit
}: SettingFormDialogProps) {
  const { t } = useI18n();
  const form = useForm<SettingFormState>({
    resolver: zodResolver(settingFormSchema),
    defaultValues: {
      key: '',
      scope: 'ORGANIZATION',
      module: '',
      organizationSpecific: true,
      valueRaw: '""'
    }
  });

  const scope = form.watch('scope');

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'edit' && setting) {
      form.reset({
        key: setting.key,
        scope: setting.scope,
        module: setting.module ?? '',
        organizationSpecific: setting.organizationId !== null,
        valueRaw: JSON.stringify(setting.value, null, 2)
      });
      return;
    }

    form.reset({
      key: '',
      scope: scopeFromSetting(),
      module: '',
      organizationSpecific: true,
      valueRaw: '""'
    });
  }, [form, mode, open, setting]);

  const submitHandler = (values: SettingFormState) => {
    const parsed = JSON.parse(values.valueRaw);
    const payload: SettingFormDialogSubmitValues = {
      key: values.key,
      scope: values.scope,
      value: parsed,
      module: values.scope === 'MODULE' ? values.module : undefined,
      organizationSpecific: values.scope === 'MODULE' ? values.organizationSpecific : undefined
    };

    onSubmit(payload);
  };

  const isEdit = mode === 'edit';
  const isModuleScope = scope === 'MODULE';
  const organizationSpecific = form.watch('organizationSpecific');
  const editSetting = isEdit ? setting : null;
  const createSubmitBlocked = !isEdit && (scope === 'GLOBAL' || (scope === 'MODULE' && !organizationSpecific)) && !isSuperAdmin;
  const editSubmitBlocked = (() => {
    if (!editSetting) {
      return false;
    }

    return (editSetting.scope === 'GLOBAL' && !isSuperAdmin) || (editSetting.scope === 'MODULE' && editSetting.organizationId === null && !isSuperAdmin);
  })();
  const isSubmitDisabled = createSubmitBlocked || editSubmitBlocked;
  const submitWarning = createSubmitBlocked || editSubmitBlocked
    ? 'Only super_admin can update GLOBAL settings and global MODULE settings.'
    : null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit setting' : 'Create setting'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update setting value. Key and scope metadata are read-only in edit mode.'
              : 'Create a new setting for global, organization or module scope.'}
          </DialogDescription>
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

          {submitWarning ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>Restricted action</AlertTitle>
              <AlertDescription>{submitWarning}</AlertDescription>
            </Alert>
          ) : null}

            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} placeholder="app.demo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={isEdit}>
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="ORGANIZATION">ORGANIZATION</option>
                      <option value="MODULE">MODULE</option>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isModuleScope || (isEdit && setting?.scope === 'MODULE') ? (
              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <FormControl>
                      <Select {...field} disabled={isEdit}>
                        <option value="">Select module</option>
                        {modules.map((module) => (
                          <option key={module.name} value={module.name}>
                            {module.title}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {isModuleScope && !isEdit ? (
              <FormField
                control={form.control}
                name="organizationSpecific"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormLabel>organizationSpecific</FormLabel>
                  </FormItem>
                )}
              />
            ) : null}

          <JsonValueEditor
            value={form.watch('valueRaw')}
            onChange={(nextValue) => form.setValue('valueRaw', nextValue, { shouldValidate: true })}
            error={form.formState.errors.valueRaw?.message}
          />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || isSubmitDisabled}>
                {isSubmitting ? t('common.saving') : isEdit ? t('common.saveChanges') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
