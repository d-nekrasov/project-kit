import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { OrganizationsToolbarProps } from '@/features/organizations/organizations-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function OrganizationsToolbar({ search, onSearchChange, status, onStatusChange }: OrganizationsToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="organizations-search">{t('common.search')}</Label>
        <Input
          id="organizations-search"
          placeholder={t('organizations.searchPlaceholder')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizations-status">{t('common.status')}</Label>
        <Select
          id="organizations-status"
          className="w-full md:max-w-36"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as typeof status)}
        >
          <option value="ALL">{t('common.all')}</option>
          <option value="ACTIVE">{t('organizations.status.active')}</option>
          <option value="INACTIVE">{t('organizations.status.inactive')}</option>
        </Select>
      </div>
    </div>
  );
}
