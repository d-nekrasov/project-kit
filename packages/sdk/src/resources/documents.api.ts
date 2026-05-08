import type { ApiClient } from '../client/api-client';
import type {
  CreateDocumentDto,
  DocumentResponse,
  DocumentsListQuery,
  DocumentsListResponse,
  UpdateDocumentDto,
  UpdateDocumentStatusDto
} from '../types/documents.types';

export class DocumentsApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: DocumentsListQuery): Promise<DocumentsListResponse> {
    return this.client.get<DocumentsListResponse>('/documents', { query });
  }

  getById(id: string): Promise<DocumentResponse> {
    return this.client.get<DocumentResponse>(`/documents/${id}`);
  }

  create(dto: CreateDocumentDto): Promise<DocumentResponse> {
    return this.client.post<DocumentResponse>('/documents', dto);
  }

  update(id: string, dto: UpdateDocumentDto): Promise<DocumentResponse> {
    return this.client.patch<DocumentResponse>(`/documents/${id}`, dto);
  }

  updateStatus(id: string, dto: UpdateDocumentStatusDto): Promise<DocumentResponse> {
    return this.client.patch<DocumentResponse>(`/documents/${id}/status`, dto);
  }
}
