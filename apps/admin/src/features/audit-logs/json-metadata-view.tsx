import { JsonViewer } from '@/components/common/json-viewer';

export function JsonMetadataView({ value }: { value: unknown }) {
  return <JsonViewer value={value} emptyText="No metadata." />;
}

