import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png"],
      manifest: {
        name: "DPWH Directory",
        short_name: "Directory",
        description: "Employee directory that works offline",
        theme_color: "#0b2a4a",
        background_color: "#0b2a4a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // keep the app files, images and the Excel library available offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  server: {
  proxy: {
  "/api": "http://127.0.0.1:3000",
  "/uploads": "http://127.0.0.1:3000",
},
  },
})
