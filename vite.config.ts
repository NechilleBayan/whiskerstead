import { defineConfig } from "vite";

// Plain-window MVP: Vite serves the canvas renderer. The sim core under
// src/sim has zero imports from src/render, so it also runs under `node --test`
// with no bundler involved.
export default defineConfig({
  root: ".",
  server: { port: 5173, open: true },
  build: { outDir: "dist", target: "es2022" },
});
