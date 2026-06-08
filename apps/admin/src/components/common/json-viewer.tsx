import { useI18n } from '@/lib/i18n/use-i18n';

type JsonViewerProps = {
  value: unknown;
  emptyText?: string;
};

export function JsonViewer({ value, emptyText = 'common.noDataAvailableYet' }: JsonViewerProps) {
  if (value === null || value === undefined) {
    return <JsonViewerEmpty emptyText={emptyText} />;
  }

  return (
    <pre className="max-h-80 overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function JsonViewerEmpty({ emptyText }: { emptyText: string }) {
  const { t } = useI18n();
  return <p className="text-sm text-muted-foreground">{emptyText.includes('.') ? t(emptyText) : emptyText}</p>;
}
