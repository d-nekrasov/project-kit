import type { ISODateString } from './common.types';

export type ProjectLocale = 'ru' | 'en';

export type InstallerStatusResponse = {
  installed: boolean;
  installedAt?: ISODateString;
  appName?: string;
  version?: string;
};

export type SetupInstallerDto = {
  appName: string;
  organizationName: string;
  organizationSlug: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  locale?: ProjectLocale;
};

export type SetupInstallerResponse = {
  installed: true;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  admin: {
    id: string;
    email: string;
    name: string;
  };
};
