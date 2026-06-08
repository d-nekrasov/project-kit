import { ApiError, type DocumentResponse, type DocumentStatus } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { DocumentFormDialog } from '@/features/documents/document-form-dialog';
import { DocumentStatusDialog } from '@/features/documents/document-status-dialog';
import { documentsQueryKeys } from '@/features/documents/documents-query-keys';
import type { DocumentFormValues, DocumentStatusFilter } from '@/features/documents/documents-page.types';
import { DocumentsTable } from '@/features/documents/documents-table';
import { DocumentsToolbar } from '@/features/documents/documents-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

function isModuleDisabledError(error: unknown) {
  return (
    error instanceof ApiError && error.status === 403 && String(error.message).toLowerCase().includes('module is disabled')
  );
}

export function DocumentsPage() {
  const auth = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocumentStatusFilter>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<DocumentResponse | null>(null);
  const [statusDocument, setStatusDocument] = useState<DocumentResponse | null>(null);

  useEffect(() => {
    setPage(1);
    setCreateDialogOpen(false);
    setEditDocument(null);
    setStatusDocument(null);
  }, [auth.activeOrganizationId]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search,
      status,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, limit, page, search, status]
  );

  const documentsQuery = useQuery({
    queryKey: documentsQueryKeys.list(queryParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.documents.list({
        page,
        limit,
        search: search || undefined,
        status: status === 'ALL' ? undefined : status
      })
  });

  const createDocumentMutation = useMutation({
    mutationFn: (values: DocumentFormValues) =>
      sdk.documents.create({
        title: values.title,
        content: values.content?.trim() ? values.content : null
      }),
    onSuccess: async () => {
      setCreateDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      ]);
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: (values: DocumentFormValues) => {
      if (!editDocument) {
        throw new Error('Document is not selected');
      }

      return sdk.documents.update(editDocument.id, {
        title: values.title,
        content: values.content?.trim() ? values.content : null
      });
    },
    onSuccess: async () => {
      setEditDocument(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      ]);
    }
  });

  const updateDocumentStatusMutation = useMutation({
    mutationFn: (nextStatus: DocumentStatus) => {
      if (!statusDocument) {
        throw new Error('Document is not selected');
      }

      return sdk.documents.updateStatus(statusDocument.id, { status: nextStatus });
    },
    onSuccess: async () => {
      setStatusDocument(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      ]);
    }
  });

  const documentsMeta = documentsQuery.isError ? undefined : documentsQuery.data?.meta;
  const documents = documentsQuery.isError ? [] : documentsQuery.data?.items ?? [];
  const moduleDisabled = documentsQuery.isError && isModuleDisabledError(documentsQuery.error);
  const pageError = documentsQuery.isError && !moduleDisabled ? getApiErrorMessage(documentsQuery.error) : null;

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('documents.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('documents.description')}</p>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)} disabled={moduleDisabled}>
          {t('documents.actions.create')}
        </Button>
      </div>

      <DocumentsToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />

      {moduleDisabled ? (
        <EmptyState
          title={t('documents.moduleDisabled.title')}
          description={t('documents.moduleDisabled.description')}
        />
      ) : null}

      {moduleDisabled ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => navigate('/modules')}>
            {t('documents.actions.goToModules')}
          </Button>
        </div>
      ) : null}

      {pageError ? <ErrorState message={pageError} /> : null}

      {!moduleDisabled ? (
        <DocumentsTable
          documents={documents}
          isLoading={documentsQuery.isLoading}
          onEdit={(document) => setEditDocument(document)}
          onChangeStatus={(document) => setStatusDocument(document)}
        />
      ) : null}

      {!moduleDisabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm">
          <div className="text-muted-foreground">
            {`${t('documents.pagination.page', {
              page: documentsMeta?.page ?? page,
              pages: documentsMeta?.totalPages ?? 1
            })} • ${t('documents.pagination.total', { total: documentsMeta?.total ?? 0 })}`}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
              {t('common.previous')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => value + 1)}
              disabled={page >= (documentsMeta?.totalPages ?? 1)}
            >
              {t('common.next')}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('common.rowsPerPage')}</span>
            <Select
              value={String(limit)}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>
        </div>
      ) : null}

      <DocumentFormDialog
        open={createDialogOpen}
        mode="create"
        isSubmitting={createDocumentMutation.isPending}
        error={createDocumentMutation.isError ? getApiErrorMessage(createDocumentMutation.error) : null}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(values) => createDocumentMutation.mutate(values)}
      />

      <DocumentFormDialog
        open={Boolean(editDocument)}
        mode="edit"
        document={editDocument}
        isSubmitting={updateDocumentMutation.isPending}
        error={updateDocumentMutation.isError ? getApiErrorMessage(updateDocumentMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditDocument(null);
          }
        }}
        onSubmit={(values) => updateDocumentMutation.mutate(values)}
      />

      <DocumentStatusDialog
        open={Boolean(statusDocument)}
        document={statusDocument}
        isSubmitting={updateDocumentStatusMutation.isPending}
        error={updateDocumentStatusMutation.isError ? getApiErrorMessage(updateDocumentStatusMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDocument(null);
          }
        }}
        onSubmit={(nextStatus) => updateDocumentStatusMutation.mutate(nextStatus)}
      />
    </div>
  );
}
