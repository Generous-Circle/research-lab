// PREVIEW ONLY build (static page with example data). Does not affect the real build.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  base: "./",
  build: { outDir: "dist-preview", rollupOptions: { input: path.resolve(__dirname, "preview.html") }, cssCodeSplit: false, assetsInlineLimit: 100000000 },
});
