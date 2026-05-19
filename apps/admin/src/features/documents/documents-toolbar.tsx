import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { DocumentsToolbarProps } from '@/features/documents/documents-page.types';

export function DocumentsToolbar({ search, onSearchChange, status, onStatusChange }: DocumentsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="documents-search">Search</Label>
        <Input
          id="documents-search"
          placeholder="Search by title or content"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="documents-status">Status</Label>
        <Select id="documents-status" value={status} onChange={(event) => onStatusChange(event.target.value as typeof status)}>
          <option value="ALL">All</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </Select>
      </div>
    </div>
  );
}
