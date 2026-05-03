# Project Kit

Monorepo skeleton for modular client web applications.

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
