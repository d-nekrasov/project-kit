import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { ModulesToolbarProps } from '@/features/modules/modules-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function ModulesToolbar({ search, onSearchChange, status, onStatusChange }: ModulesToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-end gap-4 rounded-lg border bg-card p-4">
      <div className="flex-1 space-y-2">
        <Label htmlFor="modules-search">{t('common.search')}</Label>
        <Input
          id="modules-search"
          placeholder={t('modules.searchPlaceholder')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="w-56 space-y-2">
        <Label htmlFor="modules-status">{t('common.status')}</Label>
        <Select id="modules-status" value={status} onChange={(event) => onStatusChange(event.target.value as typeof status)}>
          <option value="ALL">{t('common.all')}</option>
          <option value="ENABLED">{t('modules.status.enabled')}</option>
          <option value="DISABLED">{t('modules.status.disabled')}</option>
        </Select>
      </div>
    </div>
  );
}
