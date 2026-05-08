import type { ApiClient } from '../client/api-client';
import type {
  InstallerStatusResponse,
  SetupInstallerDto,
  SetupInstallerResponse
} from '../types/installer.types';

export class InstallerApi {
  constructor(private readonly client: ApiClient) {}

  status(): Promise<InstallerStatusResponse> {
    return this.client.get<InstallerStatusResponse>('/installer/status', {
      skipAuth: true,
      skipOrganization: true
    });
  }

  setup(dto: SetupInstallerDto): Promise<SetupInstallerResponse> {
    return this.client.post<SetupInstallerResponse>('/installer/setup', dto, {
      skipAuth: true,
      skipOrganization: true
    });
  }
}
