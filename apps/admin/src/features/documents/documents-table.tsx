import type { DocumentResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentStatusBadge } from '@/features/documents/document-status-badge';
import type { DocumentsTableProps } from '@/features/documents/documents-page.types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function preview(content: string | null) {
  if (!content) {
    return null;
  }

  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function formatUser(user: DocumentResponse['createdBy'] | DocumentResponse['updatedBy']) {
  if (!user) {
    return '—';
  }

  return `${user.name} (${user.email})`;
}

function DocumentsTableSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DocumentsTable({ documents, isLoading, onEdit, onChangeStatus }: DocumentsTableProps) {
  if (isLoading) {
    return <DocumentsTableSkeleton />;
  }

  if (!documents.length) {
    return <EmptyState title="No documents found" description="Try changing search or status filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Updated by</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead>Updated at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">{document.title}</div>
                    {preview(document.content) ? <div className="text-xs text-slate-500">{preview(document.content)}</div> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <DocumentStatusBadge status={document.status} />
                </TableCell>
                <TableCell>{formatUser(document.createdBy)}</TableCell>
                <TableCell>{formatUser(document.updatedBy)}</TableCell>
                <TableCell>{formatDate(document.createdAt)}</TableCell>
                <TableCell>{formatDate(document.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(document)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onChangeStatus(document)}>
                      Change status
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
