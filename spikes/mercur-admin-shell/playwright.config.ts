/**
 * Playwright configuration for the Mercur admin shell runtime smoke harness.
 *
 * Scope: GP/admin-panel/spikes/mercur-admin-shell only.
 * Do NOT use this config from GP/admin-panel/src or any production path.
 *
 * Run (from repo root via the pnpm script):
 *   pnpm --dir GP/admin-panel runtime-smoke
 *
 * Or directly via npx (equivalent invocation, useful for ad-hoc / CI):
 *   npx playwright test --config GP/admin-panel/spikes/mercur-admin-shell/playwright.config.ts --project=chromium
 *
 * Prerequisites:
 *   - GP backend running at GP_ADMIN_BASE_URL (default http://localhost:9002)
 *   - Mercur admin shell preview served at GP_ADMIN_PREVIEW_URL (default http://localhost:4173)
 *   - GP_ADMIN_EMAIL and GP_ADMIN_PASSWORD set (or MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD fallback)
 *
 * Runtime artifacts (gitignored):
 *   - tests/runtime-smoke/.auth-storage-state.json — admin session cookies + localStorage
 *   - tests/runtime-smoke/.playwright-results.json — Playwright JSON reporter output
 *   - tests/runtime-smoke/.playwright-route-results.json — per-route results harvested by build_admin_runtime_report.py
 */

import { defineConfig, devices } from "@playwright/test"
import * as path from "path"
import { resolvePreviewUrl } from "./tests/runtime-smoke/admin-auth.fixture"

const previewUrl = resolvePreviewUrl()

export default defineConfig({
  testDir: path.join(__dirname, "tests/runtime-smoke"),
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: path.join(
          __dirname,
          "tests/runtime-smoke/.playwright-results.json"
        ),
      },
    ],
  ],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: previewUrl,
      },
    },
  ],
})
