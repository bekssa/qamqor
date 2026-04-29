import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";


const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Qamqor',
        short_name: 'Qamqor',
        description: 'Приложение для оказания и получения помощи',
        theme_color: '#3B82F6',
        icons: [
          {
            src: 'pwa-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.qamqor\.org\/.*/i, // Adjust based on your API
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: [
      // FSD layers — order matters: more specific prefixes first
      { find: "@shared/ui", replacement: path.resolve(import.meta.dirname, "src/components/ui") },
      { find: "@shared", replacement: path.resolve(import.meta.dirname, "src/shared") },
      { find: "@features", replacement: path.resolve(import.meta.dirname, "src/features") },
      { find: "@widgets", replacement: path.resolve(import.meta.dirname, "src/widgets") },
      { find: "@entities", replacement: path.resolve(import.meta.dirname, "src/entities") },
      { find: "@pages", replacement: path.resolve(import.meta.dirname, "src/pages") },
      { find: "@app", replacement: path.resolve(import.meta.dirname, "src/app") },
      // Keep legacy alias for shadcn internal imports and attached assets
      { find: "@assets", replacement: path.resolve(import.meta.dirname, "..", "..", "attached_assets") },
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
    ],
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
