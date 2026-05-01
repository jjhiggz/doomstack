// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";
var app_config_default = defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"]
      })
    ],
    server: {
      proxy: {
        "/api": "http://localhost:3001",
        "/rpc": "http://localhost:3001"
      }
    }
  }
});
export {
  app_config_default as default
};
