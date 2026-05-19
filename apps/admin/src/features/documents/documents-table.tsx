import type { DocumentResponse } from '@project-kit/sdk';
import { MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react';

import { DataTableEmpty, DataTableShell, DataTableSkeleton } from '@/components/common/data-table-states';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

export function DocumentsTable({ documents, isLoading, onEdit, onChangeStatus }: DocumentsTableProps) {
  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (!documents.length) {
    return <DataTableEmpty title="No documents found" description="Try changing search or status filters." />;
  }

  return (
    <DataTableShell>
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
                  <div className="font-medium text-foreground">{document.title}</div>
                  {preview(document.content) ? <div className="text-xs text-muted-foreground">{preview(document.content)}</div> : null}
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
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${document.title}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(document)}>
                      <Pencil className="mr-2 inline h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeStatus(document)}>
                      <ShieldAlert className="mr-2 inline h-4 w-4" />
                      Change status
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
