import { defineConfig } from "vite";
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
