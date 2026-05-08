export class ApiError extends Error {
  status: number;
  statusText: string;
  data: unknown;

  constructor(params: {
    status: number;
    statusText: string;
    message: string;
    data?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.statusText = params.statusText;
    this.data = params.data;
  }
}
