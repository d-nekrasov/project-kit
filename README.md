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
