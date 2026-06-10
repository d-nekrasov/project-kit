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
- `/forgot-password`
- `/reset-password?token=...`
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
- `/notifications`
- `/notification-settings`

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
- choose target organization during user creation where permissions allow it
- edit user name/role
- change status
- open user detail at `/users/:id`
- view user memberships, system roles and audit-relevant metadata
- manage organization memberships where permissions allow it
- remove organization memberships as a super admin when the user keeps at least one active membership

Moving a user between organizations is done by adding or activating the target organization membership with a role from that organization, then removing the old membership. Inactive memberships do not grant permissions and are not returned in `/auth/me` for organization switching.

The user menu also includes `/profile`, where any authenticated user can view their own account and update only their display name.

### Roles page

The `/roles` page allows administrators to manage organization roles.
Roles and permissions are organization-scoped. Super admins can select an organization on `/roles` before listing, creating, or editing organization roles. The same role code, such as `user`, can have different permissions in different organizations.
It uses:
- `@project-kit/sdk`
- TanStack Query
- Roles API
- Permissions grouped API
- current organization context
- optional super admin organization selector

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

### Notifications UI

The admin app includes:
- notification bell with unread count;
- `/notifications` personal notification inbox;
- `/notification-settings` connector/template management for users with `notifications.manage`.

### Notifications backend

`NotificationsModule` provides the backend notification boundary.
Business modules call `NotificationsService.notify(...)`; they do not send email directly.

Supported MVP channels:
- in-app notifications;
- email through the global `smtp_email` connector.

Realtime notification updates use SSE in the admin app. WebSockets, SMS, messengers, retries, digests, and user preferences are not included yet.

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

To start the API from the project root via `pnpm`, run:

`pnpm --filter api start:dev`

### API environment

Create `apps/api/.env` or copy `apps/api/.env.example`.

Recovery flow uses:
- `AUTH_PASSWORD_RESET_URL`: public admin URL that receives the reset token, for example `http://localhost:3001/reset-password`
- `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES`: reset token lifetime in minutes

Password reset email delivery also depends on the global `smtp_email` notification connector being enabled and configured.

Production hardening env:
- `APP_ENV=development|test|production`: selects environment-specific behavior. `development` and `test` may use in-memory auth infrastructure by default; `production` requires Redis.
- `TRUST_PROXY=false|true|loopback|1`: configures Express `trust proxy`. When enabled behind nginx/traefik, `req.ip` is derived from trusted proxy hops instead of trusting raw `X-Forwarded-For`.
- `MULTI_INSTANCE=true|false`: marks that the API is expected to run on multiple instances. This still matters for cross-instance SSE fan-out, but not for auth Redis requirements.
- `REDIS_ENABLED=true|false` and `REDIS_URL=redis://...`: enable shared Redis infrastructure for auth rate limiting, JWT token blacklist, and realtime notification fan-out.
- `CONFIG_ENCRYPTION_KEY`: required 32-byte raw string or base64-encoded 32-byte key used to encrypt notification connector secrets such as SMTP passwords and webhook tokens.
- `SSE_MAX_CLIENTS`, `SSE_MAX_CLIENTS_PER_USER`, `SSE_HEARTBEAT_INTERVAL_MS`: protect the SSE registry from unbounded growth.

Recommended local bootstrap:
- `docker compose up -d postgres redis`
- `cp apps/api/.env.example apps/api/.env`
- leave `REDIS_ENABLED=false` for a simple dev/test setup that uses in-memory auth rate limiting and token blacklist, or set `REDIS_ENABLED=true` to test shared Redis-backed rate limits, logout invalidation, and SSE pub/sub locally.

Production guidance:
- auth rate limiting and JWT token blacklist use Redis in production, and the API fails fast during bootstrap if `APP_ENV=production` without `REDIS_ENABLED=true` and a valid `REDIS_URL`;
- there is no silent in-memory fallback for auth in production;
- when `APP_ENV=production` and `MULTI_INSTANCE=true`, the same Redis instance is also used for cross-instance SSE delivery;
- before a production deploy that includes notification connectors, set `CONFIG_ENCRYPTION_KEY` and run `pnpm --filter api prisma:backfill-notification-connector-secrets` to migrate any existing plaintext connector secrets in `NotificationConnector.config`;
- never trust `X-Forwarded-For` directly in application code. Configure `TRUST_PROXY` and use `req.ip`.

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

Forgot password:

`POST /api/auth/forgot-password`

Reset password:

`POST /api/auth/reset-password`

Validate reset token:

`POST /api/auth/reset-password/validate`

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

### Password recovery flow

The admin UI exposes password recovery on:
- `/forgot-password`
- `/reset-password?token=<resetToken>`

Backend behavior:
- `POST /api/auth/forgot-password` always returns the same neutral success message, even when the email does not exist or the user is inactive
- reset tokens are one-time, expire after `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES`, and are stored only as hashes in `PasswordResetToken`
- requesting a new reset link invalidates any previous active reset tokens for that user
- `POST /api/auth/reset-password/validate` is a read-only prevalidation endpoint used by the admin reset page before password submission
- successful password reset invalidates any remaining active reset tokens for that user
- audit logs record reset request, success, and failure events without storing the raw token in metadata
- recovery endpoints are rate-limited per IP in memory in the current MVP implementation

Email/template behavior:
- password reset email is rendered from the `auth.password_reset_requested` notification template using `emailSubject` and `emailBody`
- this template is restricted to the `EMAIL` channel only; `IN_APP` is rejected for this event
- password reset email does not create a normal inbox notification and does not go through the standard in-app notification flow

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
- user organization grouping reload after user role, status, add, remove, or organization membership changes.

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

Users endpoints require:

`Authorization: Bearer <accessToken>`

Most admin-scoped endpoints also require `x-organization-id: <organizationId>`.
Self profile endpoints (`GET /api/users/me`, `PATCH /api/users/me`) do not require an organization header.

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
    "roleId": "<roleId>",
    "organizationId": "<optionalOrganizationId>"
  }'
```

Implemented users endpoints include:
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id/status`
- `PUT /api/users/:id/organizations`

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
When a document status changes, the backend notifies the document creator if another user made the change.

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

## Notifications Module

Backend notifications are documented in `docs/notifications.md`.

Internal usage:

```ts
await notificationsService.notify({
  event: 'document.status_changed',
  organizationId,
  recipientUserIds: [userId],
  payload: {
    documentId,
    title,
    status
  }
});
```

Own notification endpoints require only `Authorization: Bearer <accessToken>`:
- `POST /api/notifications/stream-token`
- `GET /api/notifications/stream?token=<streamToken>`
- `GET /api/notifications/my`
- `GET /api/notifications/my/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

The admin notification bell uses SSE for realtime updates. Polling is only a fallback while SSE is disconnected, at most once per minute, plus normal focus/reconnect sync. The API now enforces global/per-user SSE connection caps, cleans up clients on close/error, sends heartbeat pings, and can fan out events across instances through Redis pub/sub when Redis is enabled. Sound alerts are controlled by a local browser preference on `/notifications`; the browser may require prior user interaction before allowing playback.

Connector and template management requires `Authorization`, `x-organization-id`, `notifications.manage`, and `super_admin`:
- `GET /api/notification-connectors`
- `PATCH /api/notification-connectors/:code`
- `GET /api/notification-templates`
- `PUT /api/notification-templates/:event`

Default connectors:
- `in_app`: enabled by default.
- `smtp_email`: disabled by default; password is masked in API responses.

Default templates:
- `document.created`
- `document.status_changed`
- `user.created`
- `user.status_changed`
- `user.organizations_changed`
- `user.profile_updated`

DocumentsModule emits:
- `document.created` after document creation, to `document.createdById`.
- `document.status_changed` after an actual status change, to `document.createdById`.

UsersModule emits:
- `user.created` after user creation, to the created user.
- `user.status_changed` after an actual user status change, to the target user.
- `user.organizations_changed` after membership role/status changes or membership removal, to the target user.
- `user.profile_updated` after a profile name change, including self profile updates, to the target user.

User notification payloads never include passwords, password hashes, or temporary credentials. User notifications are visible in the target user's inbox, not the actor/admin inbox.

Notification delivery is best-effort from business flows: notification failures are written to system logs with source `notifications` and do not roll back document or user changes.

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
