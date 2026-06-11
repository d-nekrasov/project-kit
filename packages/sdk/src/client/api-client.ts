import { ApiError } from './api-error';
import type { ApiClientOptions, RequestOptions } from './api-client.types';
import { buildQueryString } from './query-string';

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: ApiClientOptions['getAccessToken'];
  private readonly getOrganizationId?: ApiClientOptions['getOrganizationId'];
  private readonly onUnauthorized?: ApiClientOptions['onUnauthorized'];
  private readonly fetchImpl: typeof fetch;
  private readonly credentials: RequestCredentials;
  private readonly csrfEndpoint?: string;
  private csrfToken: string | null = null;
  private csrfHeaderName = 'X-CSRF-Token';
  private csrfTokenPromise: Promise<string> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.getOrganizationId = options.getOrganizationId;
    this.onUnauthorized = options.onUnauthorized;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.credentials = options.credentials ?? 'include';
    this.csrfEndpoint = options.csrf?.endpoint;
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

    const shouldUseCsrf = this.shouldUseCsrf(method, headers, options);
    if (shouldUseCsrf) {
      const csrfToken = await this.ensureCsrfToken(false);
      headers[this.csrfHeaderName] = csrfToken;
    }

    const url = `${this.baseUrl}${path}${buildQueryString(options.query)}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: this.credentials
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to fetch';
      throw new ApiError({
        status: 0,
        statusText: 'NETWORK_ERROR',
        message: `Network request failed (${method} ${url}): ${message}`,
        data: cause
      });
    }

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
    if (
      response.status === 403 &&
      shouldUseCsrf &&
      !options._csrfRetried &&
      this.isCsrfError(data)
    ) {
      await this.ensureCsrfToken(true);
      return this.request<T>(method, path, { ...options, _csrfRetried: true });
    }

    const message = this.resolveErrorMessage(data, response.statusText);
    const error = new ApiError({
      status: response.status,
      statusText: response.statusText,
      message,
      data
    });

    if (response.status === 401 && this.onUnauthorized && !options.skipAuth) {
      await this.onUnauthorized();
    }

    throw error;
  }

  private shouldUseCsrf(
    method: string,
    headers: Record<string, string>,
    options: RequestOptions,
  ): boolean {
    if (!this.csrfEndpoint || options.skipCsrf || isSafeMethod(method)) {
      return false;
    }

    return !Boolean(headers.Authorization);
  }

  private async ensureCsrfToken(forceRefresh: boolean): Promise<string> {
    if (!this.csrfEndpoint) {
      throw new Error('CSRF endpoint is not configured');
    }

    if (!forceRefresh && this.csrfToken) {
      return this.csrfToken;
    }

    if (!forceRefresh && this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }

    const nextTokenPromise = this.fetchCsrfToken();
    this.csrfTokenPromise = nextTokenPromise;

    try {
      return await nextTokenPromise;
    } finally {
      if (this.csrfTokenPromise === nextTokenPromise) {
        this.csrfTokenPromise = null;
      }
    }
  }

  private async fetchCsrfToken(): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}${this.csrfEndpoint}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      credentials: this.credentials
    });

    if (!response.ok) {
      const data = await this.parseErrorData(response);
      const message = this.resolveErrorMessage(data, response.statusText);
      throw new ApiError({
        status: response.status,
        statusText: response.statusText,
        message,
        data
      });
    }

    const payload = (await response.json()) as {
      csrfToken?: unknown;
      headerName?: unknown;
    };
    if (typeof payload.csrfToken !== 'string' || payload.csrfToken.length === 0) {
      throw new Error('CSRF endpoint did not return a valid token');
    }

    this.csrfToken = payload.csrfToken;
    if (typeof payload.headerName === 'string' && payload.headerName.length > 0) {
      this.csrfHeaderName = payload.headerName;
    }

    return this.csrfToken;
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

  private isCsrfError(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const message = (data as { message?: unknown }).message;
    return typeof message === 'string' && message.toLowerCase().includes('csrf');
  }
}

function isSafeMethod(method: string): boolean {
  const normalizedMethod = method.toUpperCase();
  return normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || normalizedMethod === 'OPTIONS';
}
