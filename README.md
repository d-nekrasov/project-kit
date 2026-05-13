# Project Kit

Monorepo skeleton for modular client web applications.

## MVP smoke test

See `docs/smoke-test.md`.

## Admin App

`apps/admin` is the Project Kit administration UI.

Stack:
- React
- Vite
- TypeScript
- shadcn/ui
- TanStack Query
- React Router
- `@project-kit/sdk`

### Environment

Create `apps/admin/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Project Kit
```

Commands:

```bash
pnpm --filter admin dev
pnpm --filter admin build
```

Routes:
- `/install`
- `/login`
- `/`
- `/users`
- `/roles`
- `/permissions`
- `/organizations`
- `/modules`
- `/settings`
- `/audit-logs`
- `/system-logs`
- `/documents`

The admin app uses `@project-kit/sdk` for all API calls.
The SDK receives the access token and active organization id from admin auth storage.
Admin routes and sidebar items are filtered by effective permissions from `GET /api/auth/permissions`.
TanStack Query cache is cleared on login, logout, unauthorized responses, and active organization changes.

### Users page

The first implemented admin CRUD page is `/users`.
It uses:
- `@project-kit/sdk`
- TanStack Query
- current organization context
- Users API
- Roles API for role selection

Capabilities:
- list users
- search users
- filter by status
- create user
- edit user name/role
- change status

### Roles page

The `/roles` page allows administrators to manage organization roles.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Roles API
- Permissions grouped API
- current organization context

Capabilities:
- list roles
- search roles
- include system roles
- create organization role
- edit role name
- edit role permissions grouped by module
- readonly system roles
- protected organization_admin permissions

### Permissions page

The `/permissions` page is a read-only registry of permissions registered by core and modules.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Permissions API
- current organization context

Capabilities:
- list permissions
- search permissions
- filter by module
- table view
- grouped by module view
- inspect resource/action parsed from permission code

Permissions are not created from the admin UI.
They are registered by the core platform and connected modules through manifests.

### Organizations page

The `/organizations` page allows administrators to manage organizations and branches.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Organizations API
- current organization context

Capabilities:
- list organizations
- search organizations
- filter by status
- create organization
- edit organization name/slug
- change organization status
- display usersCount and rolesCount

Only `super_admin` can create organizations and change organization status.
Non-super-admin users can see only organizations they belong to.

### Modules page

The `/modules` page shows registered core and business modules.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Module Registry API
- current organization context

Capabilities:
- list modules
- search modules
- filter by status
- inspect module manifest
- enable/disable modules
- view permissions/admin menu/settings schema metadata

Disabling a module does not delete data, permissions, or settings.
Runtime access is blocked by `ModuleEnabledGuard`.
The `core` module cannot be disabled.

### Settings page

The `/settings` page manages global, organization and module settings.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Settings API
- Module Registry API
- current organization context

Capabilities:
- list/search/filter settings
- create/update settings
- edit JSON values
- inspect module settings schema

Global settings and global module settings can be updated only by `super_admin`.
Organization settings are always scoped to the active organization.

### Documents page

The `/documents` page is the first business module UI.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Documents API
- current organization context
- ModuleEnabledGuard on backend

Capabilities:
- list documents
- search documents
- filter by status
- create document
- edit document
- change document status
- display createdBy and updatedBy

If the `documents` module is disabled in Module Registry, the API returns `403 Module is disabled`, and the page shows a module disabled state.

### Audit Logs page

The `/audit-logs` page shows user actions and security-relevant events.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Audit Logs API
- current organization context

Capabilities:
- list audit logs
- filter by action, entity type, entity id, user id, organization id and date range
- search logs
- view detailed metadata JSON
- inspect actor, organization, IP and user agent

### System Logs page

The `/system-logs` page shows technical and runtime events from the platform.
It uses:
- `@project-kit/sdk`
- TanStack Query
- System Logs API
- current organization context

Capabilities:
- list system logs
- filter by level, source, user id, organization id and date range
- search logs
- view detailed context JSON
- inspect error stack traces

System logs are for technical diagnostics.
User actions are stored separately in Audit Logs.

## SDK

`packages/sdk` contains a framework-agnostic TypeScript API client for Project Kit.
It handles:
- base API URL;
- Authorization header;
- active organization header;
- query serialization;
- JSON request/response handling;
- typed API errors;
- typed API resources.

Example:

```ts
import { createProjectKitSdk } from '@project-kit/sdk';

const sdk = createProjectKitSdk({
  baseUrl: 'http://localhost:3000/api',
  getAccessToken: () => localStorage.getItem('accessToken'),
  getOrganizationId: () => localStorage.getItem('activeOrganizationId'),
  onUnauthorized: () => {
    localStorage.removeItem('accessToken');
  }
});

const { accessToken, user } = await sdk.auth.login({
  email: 'admin@example.com',
  password: 'password123'
});

const users = await sdk.users.list({
  page: 1,
  limit: 20
});
```

The SDK does not store tokens itself. The application decides where to store access token and active organization id.

## Quick start

1. `pnpm install`
2. `docker compose up -d`
3. `pnpm --filter api prisma:generate`
4. `pnpm --filter api prisma:migrate dev`
5. `pnpm --filter api start:dev`

## Installer

Check installation status:

`GET /api/installer/status`

Run initial setup:

`POST /api/installer/setup`

Example body:

```json
{
  "appName": "Project Kit",
  "organizationName": "Default Organization",
  "organizationSlug": "default",
  "adminEmail": "admin@example.com",
  "adminPassword": "password123",
  "adminName": "Admin"
}
```

## Auth

Login:

`POST /api/auth/login`

Me:

`GET /api/auth/me`

Effective permissions for the active organization:

`GET /api/auth/permissions`

Authorization header:

`Authorization: Bearer <accessToken>`

Example:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"

curl http://localhost:3000/api/auth/permissions \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Organization Context

Protected organization-aware endpoints require:

`x-organization-id: <organizationId>`

`Authorization: Bearer <accessToken>`

Example:

```bash
curl http://localhost:3000/api/auth/context \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Permissions

Casbin policies are loaded into memory.

Available reload modes:
- full reload after installer setup;
- role policy reload after role permissions changes;
- user organization grouping reload after user role changes.

Full reload remains available as a safe fallback.

Example:

```ts
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@Permissions('users.read')
```

Permission check endpoint:

```bash
curl http://localhost:3000/api/auth/permissions-check \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Permissions API

All permissions endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl http://localhost:3000/api/permissions \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl http://localhost:3000/api/permissions/grouped \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl http://localhost:3000/api/permissions/modules \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Users

All users endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "name": "Manager",
    "password": "password123",
    "roleId": "<roleId>"
  }'
```

## Roles

All roles endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl http://localhost:3000/api/roles \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl -X POST http://localhost:3000/api/roles \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "manager",
    "name": "Manager",
    "permissions": ["users.read"]
  }'

curl -X PATCH http://localhost:3000/api/roles/<roleId>/permissions \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["users.read", "users.update"]
  }'
```

## Organizations

All organization endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl http://localhost:3000/api/organizations \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Branch",
    "slug": "new-branch"
  }'

curl -X PATCH http://localhost:3000/api/organizations/<organizationId> \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Branch"
  }'
```

## Settings

All settings endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl "http://localhost:3000/api/settings" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl "http://localhost:3000/api/settings/app.name?scope=GLOBAL" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl -X PUT "http://localhost:3000/api/settings/app.name" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "GLOBAL",
    "value": "Project Kit"
  }'

curl -X PUT "http://localhost:3000/api/settings/organization.timezone" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "ORGANIZATION",
    "value": "Europe/Amsterdam"
  }'

curl -X PUT "http://localhost:3000/api/settings/documents.maxFileSize" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "MODULE",
    "module": "documents",
    "organizationSpecific": true,
    "value": 10485760
  }'
```

## Module system

Project Kit consists of core platform modules and explicitly connected business modules.

Core modules:
- auth
- users
- organizations
- roles
- permissions
- settings
- logs
- module registry

Business modules:
- documents
- reports
- integrations
- custom client modules

### How modules are connected

Modules are connected explicitly in `AppModule`.

```ts
@Module({
  imports: [
    // Core modules
    // ...
    DocumentsModule,
  ],
})
export class AppModule {}
```

Each module can export a manifest:

```ts
export const DOCUMENTS_MODULE_MANIFEST = {
  name: 'documents',
  title: 'Documents',
  version: '0.1.0',
  permissions: [
    'documents.read',
    'documents.create',
    'documents.update',
    'documents.delete',
  ],
  adminMenu: [
    {
      label: 'Documents',
      path: '/documents',
      permission: 'documents.read',
    },
  ],
};
```

At startup, the module registers its manifest through `ModuleRegistryService.registerModules(...)`.

The registry:
- stores module name, title, version and manifest;
- upserts module permissions;
- preserves disabled status on restart;
- does not delete module data when disabled.

### Runtime module guard

Business module endpoints can be protected with `ModuleEnabledGuard`.

```ts
@Controller('documents')
@ModuleKey('documents')
@UseGuards(
  JwtAuthGuard,
  OrganizationGuard,
  ModuleEnabledGuard,
  PermissionsGuard,
)
export class DocumentsController {}
```

If the module is disabled in ModuleRegistry, its endpoints return `403 Forbidden`.

Disabling a module:
- does not delete module data;
- does not delete module permissions;
- does not remove settings;
- only blocks runtime access and allows UI to hide menu items.

## Documents Module

Endpoints:
- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents`
- `PATCH /api/documents/:id`
- `PATCH /api/documents/:id/status`

Documents endpoints are protected by `ModuleEnabledGuard`.
If module `documents` is disabled, documents API returns `403`.

Required headers:
- `Authorization: Bearer <accessToken>`
- `x-organization-id: <organizationId>`

Examples:

```bash
curl "http://localhost:3000/api/documents" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl -X POST "http://localhost:3000/api/documents" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First document",
    "content": "Document content"
  }'

curl -X PATCH "http://localhost:3000/api/documents/<documentId>" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated document"
  }'

curl -X PATCH "http://localhost:3000/api/documents/<documentId>/status" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PUBLISHED"
  }'
```

## System Logs

All system logs endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl "http://localhost:3000/api/system-logs" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl "http://localhost:3000/api/system-logs?level=ERROR&source=casbin" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl "http://localhost:3000/api/system-logs/<logId>" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Audit Logs

All audit logs endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl "http://localhost:3000/api/audit-logs" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl "http://localhost:3000/api/audit-logs?action=user.create" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl "http://localhost:3000/api/audit-logs/<logId>" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"
```

## Module Registry

All module endpoints require:

`Authorization: Bearer <accessToken>`

`x-organization-id: <organizationId>`

Examples:

```bash
curl "http://localhost:3000/api/modules" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl "http://localhost:3000/api/modules/core" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>"

curl -X PATCH "http://localhost:3000/api/modules/documents/status" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-organization-id: <organizationId>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DISABLED"
  }'
```
