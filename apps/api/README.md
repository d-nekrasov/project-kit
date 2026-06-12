# API (apps/api)

NestJS-бэкенд монорепо project-kit. Конфигурация — через переменные окружения,
см. [.env.example](.env.example) с комментариями к каждой переменной.

## Runbook: безопасная установка (окно установки)

Пока система не установлена, `POST /api/installer/setup` неаутентифицирован
(системы и пользователей ещё нет) — любой, кто дотягивается до API по сети,
мог бы выполнить установку и стать super_admin. Эндпоинт защищён тремя
механизмами:

- **install-токен** — env `INSTALL_TOKEN`, клиент передаёт его в заголовке
  `X-Install-Token`. В `APP_ENV=production` обязателен: без него setup
  отвечает `403 Set INSTALL_TOKEN to enable installation` (старт приложения
  при этом не блокируется). В development/test токен опционален, но если он
  задан — проверяется; если не задан, а система не установлена, при старте
  пишется warning.
- **rate-limit** — 3 попытки setup с одного IP за 15 минут, дальше `429`.
- **повторная установка невозможна** — после установки setup всегда отвечает
  `409`, токен больше не участвует в решении.

`GET /api/installer/status` публичен и отдаёт только `{ installed: boolean }`.

Порядок установки в production:

1. Поднимите API либо недоступным снаружи (firewall/private network), либо с
   заданным `INSTALL_TOKEN`:

   ```bash
   export INSTALL_TOKEN=$(openssl rand -hex 32)
   ```

2. Выполните установку — через страницу `/install` админки (поле
   «Install token») или напрямую:

   ```bash
   curl -X POST https://<host>/api/installer/setup \
     -H "Content-Type: application/json" \
     -H "X-Install-Token: $INSTALL_TOKEN" \
     -d '{ "appName": "...", "organizationName": "...", "organizationSlug": "...",
           "adminEmail": "...", "adminPassword": "...", "adminName": "..." }'
   ```

3. После успешной установки удалите `INSTALL_TOKEN` из окружения и
   перезапустите API (напоминание об этом пишется в лог после setup).
   Уже установленная система стартует и работает без этой переменной.
