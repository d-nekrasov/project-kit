export type ID = string;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type ISODateString = string;

export type RequestMetadata = {
  ip?: string | null;
  userAgent?: string | null;
};
