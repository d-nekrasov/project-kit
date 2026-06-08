import type { DocumentResponse } from '@project-kit/sdk';
import { MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react';

import { DataTableEmpty, DataTableShell, DataTableSkeleton } from '@/components/common/data-table-states';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentStatusBadge } from '@/features/documents/document-status-badge';
import type { DocumentsTableProps } from '@/features/documents/documents-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

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
  const { t } = useI18n();

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (!documents.length) {
    return <DataTableEmpty title={t('documents.empty.title')} description={t('documents.empty.description')} />;
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('documents.table.title')}</TableHead>
            <TableHead>{t('documents.table.status')}</TableHead>
            <TableHead>{t('documents.table.createdBy')}</TableHead>
            <TableHead>{t('documents.fields.updatedBy')}</TableHead>
            <TableHead>{t('documents.table.createdAt')}</TableHead>
            <TableHead>{t('documents.fields.updatedAt')}</TableHead>
            <TableHead className="text-right">{t('documents.table.actions')}</TableHead>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t('documents.table.openActions', { title: document.title })}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(document)}>
                      <Pencil className="mr-2 inline h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeStatus(document)}>
                      <ShieldAlert className="mr-2 inline h-4 w-4" />
                      {t('documents.actions.changeStatus')}
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
