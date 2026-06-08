import { JsonViewer } from '@/components/common/json-viewer';
import { useI18n } from '@/lib/i18n/use-i18n';

export function JsonMetadataView({ value }: { value: unknown }) {
  const { t } = useI18n();
  return <JsonViewer value={value} emptyText={t('common.noDataAvailableYet')} />;
}
