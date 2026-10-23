import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { fileURLToPath } from "node:url";

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "",
  plugins: [preact()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    modulePreload: false,
    rollupOptions: {
      input: {
        devtools: root("devtools.html"),
        panel: root("panel.html"),
      },
    },
  },
});
