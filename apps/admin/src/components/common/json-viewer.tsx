type JsonViewerProps = {
  value: unknown;
  emptyText?: string;
};

export function JsonViewer({ value, emptyText = 'No data.' }: JsonViewerProps) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <pre className="max-h-80 overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

