export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  systemRoles: string[];
  organizations: {
    id: string;
    name: string;
    slug: string;
    role: string;
  }[];
};
