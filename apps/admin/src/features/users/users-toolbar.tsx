import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { UsersToolbarProps } from '@/features/users/users-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function UsersToolbar({ search, onSearchChange, status, onStatusChange }: UsersToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="users-search">{t('common.search')}</Label>
        <Input
          id="users-search"
          placeholder={t('users.searchPlaceholder')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="users-status">{t('users.filters.status')}</Label>
        <Select
          id="users-status"
          className="w-full md:max-w-36"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as typeof status)}
        >
          <option value="ALL">{t('common.all')}</option>
          <option value="ACTIVE">{t('users.status.active')}</option>
          <option value="INACTIVE">{t('users.status.inactive')}</option>
          <option value="BLOCKED">{t('users.status.blocked')}</option>
        </Select>
      </div>
    </div>
  );
}
