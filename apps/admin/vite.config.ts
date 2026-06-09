import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function normalizePwaLocale(value: string | undefined) {
  return value === 'en' ? 'en' : 'ru';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const pwaLocale = normalizePwaLocale(env.VITE_PWA_LOCALE ?? process.env.VITE_PWA_LOCALE);
  const pwaName = env.VITE_PWA_NAME ?? process.env.VITE_PWA_NAME ?? 'Project Kit Admin';
  const pwaShortName = env.VITE_PWA_SHORT_NAME ?? process.env.VITE_PWA_SHORT_NAME ?? 'PK Admin';
  const pwaDescription =
    env.VITE_PWA_DESCRIPTION ??
    process.env.VITE_PWA_DESCRIPTION ??
    (pwaLocale === 'en' ? 'Administrative interface for Project Kit.' : 'Административный интерфейс Project Kit.');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['pwa-icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
        manifest: {
          name: pwaName,
          short_name: pwaShortName,
          description: pwaDescription,
          // Manifest is generated at build time, so locale comes from env rather than runtime backend settings.
          lang: pwaLocale,
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#0f172a',
          background_color: '#f7f8fa',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          navigateFallback: null,
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
              options: {
                precacheFallback: {
                  fallbackURL: '/offline.html'
                }
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly'
            },
            {
              urlPattern: ({ request, url }) =>
                !url.pathname.startsWith('/api/') &&
                ['style', 'script', 'worker', 'font', 'image'].includes(request.destination),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 128,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  };
});
