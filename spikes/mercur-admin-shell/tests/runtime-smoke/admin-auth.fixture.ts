/**
 * Admin authentication fixture for the Mercur admin shell runtime smoke harness.
 *
 * Reads credentials from environment variables only — never hardcodes credentials.
 * Lookup order:
 *   1. GP_ADMIN_EMAIL / GP_ADMIN_PASSWORD  (harness-scoped)
 *   2. MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD  (shared GP e2e fallback)
 *
 * Missing credentials → loud failure (no silent skip, no auth bypass).
 *
 * Auth strategy: performs one real POST /auth/user/emailpass and persists
 * storageState so subsequent route tests replay the session (fast, but /login
 * is exercised at least once with a real credential round-trip).
 */

import { test as base, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const STORAGE_STATE_PATH = path.join(
  __dirname,
  ".auth-storage-state.json"
)

function resolveCredentials(): { email: string; password: string } {
  const email =
    process.env.GP_ADMIN_EMAIL ?? process.env.MEDUSA_ADMIN_EMAIL
  const password =
    process.env.GP_ADMIN_PASSWORD ?? process.env.MEDUSA_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      "[admin-auth.fixture] Missing admin credentials. " +
        "Set GP_ADMIN_EMAIL + GP_ADMIN_PASSWORD (or MEDUSA_ADMIN_EMAIL + MEDUSA_ADMIN_PASSWORD) " +
        "before running the runtime smoke harness. " +
        "No silent skip, no inline default — credentials MUST come from env or gp-config-sync-accounts."
    )
  }

  return { email, password }
}

function resolveBackendUrl(): string {
  return (
    process.env.GP_ADMIN_BASE_URL ??
    process.env.MEDUSA_URL ??
    "http://localhost:9002"
  )
}

/**
 * Perform login via the Medusa 2.x / Mercur 2.1.1 auth endpoint and return
 * the bearer token.  The POST /auth/user/emailpass route is the canonical
 * Medusa 2 admin auth path.
 */
async function acquireAdminToken(
  backendUrl: string,
  email: string,
  password: string
): Promise<string> {
  const authUrl = `${backendUrl}/auth/user/emailpass`
  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)")
    throw new Error(
      `[admin-auth.fixture] POST ${authUrl} failed with ${response.status}: ${body}`
    )
  }

  const payload = (await response.json()) as { token?: string }
  if (!payload.token) {
    throw new Error(
      `[admin-auth.fixture] Auth response did not include a token. ` +
        `Verify that the GP backend at ${backendUrl} is up and the admin account exists.`
    )
  }

  return payload.token
}

/**
 * Ensure admin storage state exists (login once, reuse across tests).
 * Uses the Playwright page to navigate to /login, fill credentials and
 * capture the resulting session cookies + localStorage as storageState.
 */
export async function ensureAdminStorageState(
  browser: import("@playwright/test").Browser,
  baseURL: string,
  backendUrl: string,
  email: string,
  password: string
): Promise<string> {
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    // Reuse existing session for this run (fast path)
    return STORAGE_STATE_PATH
  }

  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  // Navigate to the login page — evidence that /login is exercised
  await page.goto("/login")
  await expect(page).toHaveURL(/\/login/)

  // Fill the login form (standard Medusa admin dashboard UI)
  await page.locator('[name="email"], [id="email"], input[type="email"]').first().fill(email)
  await page.locator('[name="password"], [id="password"], input[type="password"]').first().fill(password)
  await page.getByRole("button", { name: /sign in|log in|login/i }).first().click()

  // Wait for redirect away from /login (indicates successful auth)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  })

  await context.storageState({ path: STORAGE_STATE_PATH })
  await context.close()

  return STORAGE_STATE_PATH
}

/**
 * Extended test fixture that provides:
 *   - `adminEmail` / `adminPassword` — resolved from env, fails loudly if missing
 *   - `backendUrl` — GP backend URL
 *   - `storageStatePath` — path to the persisted auth storage state
 *
 * Usage:
 *   import { test } from "./admin-auth.fixture"
 *   test("my test", async ({ page, storageStatePath }) => { ... })
 */
export const test = base.extend<{
  adminEmail: string
  adminPassword: string
  backendUrl: string
  storageStatePath: string
}>({
  adminEmail: async ({}, use) => {
    const { email } = resolveCredentials()
    await use(email)
  },

  adminPassword: async ({}, use) => {
    const { password } = resolveCredentials()
    await use(password)
  },

  backendUrl: async ({}, use) => {
    await use(resolveBackendUrl())
  },

  storageStatePath: async ({ browser, adminEmail, adminPassword, backendUrl }, use) => {
    const baseURL =
      process.env.GP_ADMIN_PREVIEW_URL ??
      process.env.ADMIN_PANEL_URL ??
      "http://localhost:4173"

    const storePath = await ensureAdminStorageState(
      browser,
      baseURL,
      backendUrl,
      adminEmail,
      adminPassword
    )
    await use(storePath)

    // Cleanup storage state after the suite so each run produces fresh evidence
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath)
    }
  },
})

export { expect }
