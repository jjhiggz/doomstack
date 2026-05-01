import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
    server: {
      proxy: {
        "/api": "http://localhost:3001",
        "/rpc": "http://localhost:3001",
      },
    },
  },
});
