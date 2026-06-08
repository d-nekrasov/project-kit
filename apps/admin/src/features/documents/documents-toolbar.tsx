import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { DocumentsToolbarProps } from '@/features/documents/documents-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function DocumentsToolbar({ search, onSearchChange, status, onStatusChange }: DocumentsToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="documents-search">{t('common.search')}</Label>
        <Input
          id="documents-search"
          placeholder={t('documents.fields.search')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="documents-status">{t('common.status')}</Label>
        <Select id="documents-status" value={status} onChange={(event) => onStatusChange(event.target.value as typeof status)}>
          <option value="ALL">{t('common.all')}</option>
          <option value="DRAFT">{t('documents.status.draft')}</option>
          <option value="PUBLISHED">{t('documents.status.published')}</option>
          <option value="ARCHIVED">{t('documents.status.archived')}</option>
        </Select>
      </div>
    </div>
  );
}
