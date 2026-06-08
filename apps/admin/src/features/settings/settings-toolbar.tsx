import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { SettingsToolbarProps } from '@/features/settings/settings-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function SettingsToolbar({
  search,
  onSearchChange,
  scope,
  onScopeChange,
  module,
  onModuleChange,
  modules,
  onCreate,
  onOpenSchema
}: SettingsToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-12 lg:items-end">
      <div className="space-y-2 lg:col-span-5">
        <Label htmlFor="settings-search">{t('common.search')}</Label>
        <Input
          id="settings-search"
          placeholder={t('settings.searchPlaceholder')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="settings-scope">{t('common.scope')}</Label>
        <Select id="settings-scope" value={scope} onChange={(event) => onScopeChange(event.target.value as 'ALL' | 'GLOBAL' | 'ORGANIZATION' | 'MODULE')}>
          <option value="ALL">{t('settings.toolbar.allScopes')}</option>
          <option value="GLOBAL">{t('settings.scope.global')}</option>
          <option value="ORGANIZATION">{t('settings.scope.organization')}</option>
          <option value="MODULE">{t('settings.scope.module')}</option>
        </Select>
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="settings-module">{t('common.module')}</Label>
        <Select id="settings-module" value={module} onChange={(event) => onModuleChange(event.target.value)}>
          <option value="ALL">{t('settings.toolbar.allModules')}</option>
          {modules.map((item) => (
            <option key={item.name} value={item.name}>
              {item.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-end gap-2 lg:col-span-3 lg:justify-end">
        <Button type="button" onClick={onCreate}>
          {t('settings.toolbar.new')}
        </Button>
        <Button type="button" variant="outline" onClick={onOpenSchema}>
          {t('settings.toolbar.schema')}
        </Button>
      </div>
    </div>
  );
}
