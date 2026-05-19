import type { ReactNode } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';

type DataTableShellProps = {
  children: ReactNode;
};

type DataTableSkeletonProps = {
  rows?: number;
};

type DataTableEmptyProps = {
  title: string;
  description: string;
};

type DataTableErrorProps = {
  message: string;
};

export function DataTableShell({ children }: DataTableShellProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTableSkeleton({ rows = 8 }: DataTableSkeletonProps) {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DataTableEmpty({ title, description }: DataTableEmptyProps) {
  return <EmptyState title={title} description={description} />;
}

export function DataTableError({ message }: DataTableErrorProps) {
  return <ErrorState message={message} />;
}
