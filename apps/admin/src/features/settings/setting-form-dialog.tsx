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
import { translateWithFallback } from '@/lib/i18n/translate-with-fallback';

type SettingFormState = {
  key: string;
  scope: SettingScope;
  module?: string;
  organizationSpecific: boolean;
  valueRaw: string;
};

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
  const settingFormSchema = z
    .object({
      key: z.string().min(2, t('settings.form.validation.keyMin')),
      scope: z.enum(['GLOBAL', 'ORGANIZATION', 'MODULE']),
      module: z.string().optional(),
      organizationSpecific: z.boolean(),
      valueRaw: z.string().min(1, t('settings.form.validation.valueRequired'))
    })
    .superRefine((values, ctx) => {
      if (values.scope === 'MODULE' && !values.module) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['module'],
          message: t('settings.form.validation.moduleRequired')
        });
      }

      try {
        JSON.parse(values.valueRaw);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valueRaw'],
          message: t('settings.form.validation.invalidJson')
        });
      }
    });
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
    ? t('settings.form.restrictedDescription')
    : null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('settings.form.editTitle') : t('settings.form.createTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('settings.form.editDescription') : t('settings.form.createDescription')}
          </DialogDescription>
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

          {submitWarning ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>{t('settings.form.restrictedTitle')}</AlertTitle>
              <AlertDescription>{submitWarning}</AlertDescription>
            </Alert>
          ) : null}

            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.key')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} placeholder={t('settings.form.keyPlaceholder')} />
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
                  <FormLabel>{t('common.scope')}</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={isEdit}>
                      <option value="GLOBAL">{t('settings.scope.global')}</option>
                      <option value="ORGANIZATION">{t('settings.scope.organization')}</option>
                      <option value="MODULE">{t('settings.scope.module')}</option>
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
                    <FormLabel>{t('common.module')}</FormLabel>
                    <FormControl>
                      <Select {...field} disabled={isEdit}>
                        <option value="">{t('settings.form.selectModule')}</option>
                        {modules.map((module) => (
                          <option key={module.name} value={module.name}>
                            {translateWithFallback(t, module.manifest?.titleKey, module.title)}
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
                    <FormLabel>{t('settings.form.organizationSpecific')}</FormLabel>
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
