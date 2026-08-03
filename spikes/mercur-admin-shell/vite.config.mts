import { mercurDashboardPlugin } from "@mercurjs/dashboard-sdk"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv } from "vite"

const spikeRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, spikeRoot)

  return {
    root: spikeRoot,
    plugins: [
      react(),
      mercurDashboardPlugin({
        medusaConfigPath: "../../../backend/medusa-config.ts",
        backendUrl: env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9002",
        name: "GP Admin",
        i18n: {
          defaultLanguage: "pl",
        },
      }),
    ],
    build: {
      outDir: path.resolve(spikeRoot, "dist"),
      emptyOutDir: true,
    },
  }
})
