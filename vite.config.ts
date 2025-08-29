import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      devOptions: { enabled: true },
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
      },
      manifest: {
        name: "Shokubun Todo",
        short_name: "Shokubun Todo",
        start_url: ".",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0ea5e9",
        description: "A powerful and modern todo application.",
        icons: [
          {
            src: "https://placehold.co/192x192/0ea5e9/ffffff?text=Todo",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "https://placehold.co/512x512/0ea5e9/ffffff?text=Todo",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
