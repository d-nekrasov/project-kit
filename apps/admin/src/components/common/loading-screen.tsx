import { useI18n } from '@/lib/i18n/use-i18n';

export function LoadingScreen() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
    </div>
  );
}
