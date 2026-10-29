import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Builds the Hub into src/hub, which the Electron app loads with loadFile.
export default defineConfig({
  plugins: [preact()],
  base: "./",
  build: { outDir: "../src/hub", emptyOutDir: true, target: "chrome120", assetsInlineLimit: 0 },
});
