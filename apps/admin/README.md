# Admin PWA

`apps/admin` настроен как installable PWA на базе `vite-plugin-pwa`.

## Что включено

- Web App Manifest с `name`, `short_name`, `start_url`, `scope`, `theme_color`, `background_color` и наборами иконок `192x192`, `512x512`, `512x512 maskable`.
- Service worker в режиме `registerType: 'prompt'` через `virtual:pwa-register/react`.
- Offline fallback для навигации на `/offline.html` с runtime-переключением `ru/en` через `project-kit.locale` в `localStorage`.
- Кэширование только статических ассетов (`style`, `script`, `worker`, `font`, `image`) по стратегии `StaleWhileRevalidate`.
- UI для установки приложения из меню пользователя.
- UI для controlled update flow без автоматической перезагрузки.
- Offline banner на уровне layout, который показывает сетевой статус интерфейса.

## Что намеренно не реализовано

- Кэширование API-запросов, auth-ответов и пользовательских данных. Для `/api/*` используется `NetworkOnly`.
- Фоновая синхронизация, push-уведомления и периодический background refresh.
- Полноценный offline-first режим для защищенных экранов.
- Автоматический `skipWaiting`/auto-reload без действия пользователя.
- Кастомная аналитика ошибок service worker внутри production UI.

## Service Worker Notes

- Навигационные запросы идут в сеть и только при сетевом сбое получают fallback на `/offline.html`.
- `/api/*` исключены из precache fallback и runtime cache, чтобы не ломать auth, session/cookie flow и актуальность данных.
- Обновление controlled: новая версия показывает `PwaUpdatePrompt`, после подтверждения вызывается `updateServiceWorker(true)`.
- Reload loop не ожидается, потому что обновление не применяется автоматически на каждом старте и не завязано на unconditional reload.
- Manifest генерируется на build-time, поэтому его `lang`, `name`, `short_name` и `description` настраиваются через `VITE_PWA_*` env и не могут синхронно читать runtime `system.locale` из backend settings.

## Как тестировать локально

1. Установить зависимости workspace: `pnpm install`.
2. Запустить typecheck: `pnpm --filter admin typecheck`.
3. Собрать production bundle: `pnpm --filter admin build`.
4. Поднять preview: `pnpm --filter admin preview`.
5. Открыть preview в браузере по адресу, который напечатает Vite.

## PWA localization

- Runtime locale приложения после загрузки каталога сохраняется в `localStorage` под ключом `project-kit.locale` и выставляется в `document.documentElement.lang`.
- `/offline.html` читает locale в порядке: `?lang=...` -> `localStorage['project-kit.locale']` -> `<html lang>` -> `navigator.language`, затем нормализует его до `ru` или `en`.
- Manifest не читает `/api/i18n/catalog` и другие backend settings, потому что собирается во время `vite build`, когда runtime API еще недоступен.
- Для build-time настройки manifest используйте:
  - `VITE_PWA_LOCALE`
  - `VITE_PWA_NAME`
  - `VITE_PWA_SHORT_NAME`
  - `VITE_PWA_DESCRIPTION`
- Если env не заданы, используются безопасные fallback значения, и сборка остается рабочей.

## Как проверять Lighthouse

1. Запустить `pnpm --filter admin build`.
2. Запустить `pnpm --filter admin preview`.
3. В Chrome открыть preview URL.
4. Открыть DevTools -> Lighthouse.
5. Запустить как минимум категории `PWA`, `Performance`, `Best Practices`.
6. Проверить:
   - manifest определяется корректно;
   - service worker зарегистрирован;
   - installability проходит без ошибок;
   - offline fallback отдает `/offline.html` для navigation request без сети.

## Как проверять install / update / offline

### Install

1. Открыть production preview по HTTPS или на локальном trusted origin.
2. В меню пользователя нажать `Установить приложение`.
3. Для Safari использовать системный flow:
   - macOS: `File -> Add to Dock`
   - iOS/iPadOS: `Share -> Add to Home Screen`

### Update

1. Открыть уже установленный production preview.
2. Внести изменение в bundle или versioned asset и пересобрать приложение.
3. Обновить страницу.
4. Убедиться, что появился `PwaUpdatePrompt`.
5. Нажать `Обновить` и проверить, что новая версия активировалась без цикла перезагрузки.

### Offline

1. Открыть приложение после production build и прогреть ассеты.
2. В DevTools -> Network включить offline.
3. Перезагрузить route навигации.
4. Убедиться, что показывается `/offline.html`.
5. Проверить, что запросы к `/api/*` не берутся из cache storage и завершаются сетевой ошибкой.
