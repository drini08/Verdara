import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:5000";
  const frontendPort = Number(env.VITE_PORT || env.PORT || 5173);

  return {
    plugins: [
      react(),
      {
        name: "verdara-log-frontend-port",
        configureServer(server) {
          const resolvedPort = server.config.server?.port || frontendPort;
          server.httpServer?.once("listening", () => {
            const host = server.config.server?.host || "localhost";
            console.log(`Verdara frontend running on http://${host}:${resolvedPort}`);
          });
        },
      },
    ],
    server: {
      port: frontendPort,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
