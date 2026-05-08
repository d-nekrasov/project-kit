import { ApiError } from './api-error';
import type { ApiClientOptions, RequestOptions } from './api-client.types';
import { buildQueryString } from './query-string';

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: ApiClientOptions['getAccessToken'];
  private readonly getOrganizationId?: ApiClientOptions['getOrganizationId'];
  private readonly onUnauthorized?: ApiClientOptions['onUnauthorized'];
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.getOrganizationId = options.getOrganizationId;
    this.onUnauthorized = options.onUnauthorized;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (!options.skipAuth && this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (!options.skipOrganization && this.getOrganizationId) {
      const organizationId = await this.getOrganizationId();
      if (organizationId) {
        headers['x-organization-id'] = organizationId;
      }
    }

    const url = `${this.baseUrl}${path}${buildQueryString(options.query)}`;
    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    }

    const data = await this.parseErrorData(response);
    const message = this.resolveErrorMessage(data, response.statusText);
    const error = new ApiError({
      status: response.status,
      statusText: response.statusText,
      message,
      data
    });

    if (response.status === 401 && this.onUnauthorized) {
      await this.onUnauthorized();
    }

    throw error;
  }

  private async parseErrorData(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return undefined;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private resolveErrorMessage(data: unknown, statusText: string): string {
    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }

      const error = (data as { error?: unknown }).error;
      if (typeof error === 'string' && error.length > 0) {
        return error;
      }
    }

    return statusText || 'Request failed';
  }
}
