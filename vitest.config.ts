import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@a2ui/contracts": path.resolve(__dirname, "packages/a2ui-contracts"),
      "@a2ui/ui": path.resolve(__dirname, "packages/a2ui-ui/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
