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
 * Auth strategy: performs one real login via the admin shell `/login` form,
 * captures the resulting session cookies + localStorage as Playwright
 * `storageState` and reuses it across the remaining 7 route tests so that
 * `/login` is exercised at least once with a real credential round-trip.
 *
 * Storage state is gitignored (see GP/admin-panel/.gitignore) and removed by
 * `purgeAdminStorageState` on teardown to avoid stale-auth false negatives on
 * the next run.
 */

import { test as base, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const STORAGE_STATE_PATH = path.join(
  __dirname,
  ".auth-storage-state.json"
)

/**
 * Default preview URL for the admin shell candidate. Single source of truth —
 * referenced by `playwright.config.ts`, this fixture and the smoke spec.
 */
export function resolvePreviewUrl(): string {
  return (
    process.env.GP_ADMIN_PREVIEW_URL ??
    process.env.ADMIN_PANEL_URL ??
    "http://localhost:4173"
  )
}

export function resolveBackendUrl(): string {
  return (
    process.env.GP_ADMIN_BASE_URL ??
    process.env.MEDUSA_URL ??
    "http://localhost:9002"
  )
}

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

/**
 * Ensure admin storage state exists (login once, reuse across tests).
 *
 * Drives the admin shell `/login` form, captures the resulting session
 * cookies + localStorage as Playwright storageState. Subsequent tests reuse
 * the storage state file by path so `/login` only round-trips once per run.
 */
export async function ensureAdminStorageState(
  browser: import("@playwright/test").Browser,
  baseURL: string,
  _backendUrl: string,
  email: string,
  password: string
): Promise<string> {
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    // Reuse existing session for this run (fast path).
    // The harness is responsible for purging the file on teardown so a stale
    // session from a previous run never bleeds into the current run.
    return STORAGE_STATE_PATH
  }

  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  // Navigate to the login page — evidence that /login is exercised.
  await page.goto("/login")
  await expect(page).toHaveURL(/\/login/)

  // Fill the login form (standard Medusa admin dashboard UI).
  await page.locator('[name="email"], [id="email"], input[type="email"]').first().fill(email)
  await page.locator('[name="password"], [id="password"], input[type="password"]').first().fill(password)
  // Locale-agnostic submit selector. Mercur dashboard renders PL by default
  // ("Kontynuuj przez Email" / "Zaloguj się"); EN fallback covers other modes.
  // We prefer a typed submit button if present; otherwise match common PL/EN labels.
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Kontynuuj"), button:has-text("Zaloguj")'
  ).or(
    page.getByRole("button", { name: /sign in|log in|login|kontynuuj|zaloguj/i })
  )
  await submitButton.first().click()

  // Wait for redirect away from /login (indicates successful auth).
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  })

  await context.storageState({ path: STORAGE_STATE_PATH })
  await context.close()

  return STORAGE_STATE_PATH
}

/**
 * Remove the storage state file. Call from a Playwright `afterAll` (or
 * `globalTeardown`) so the next harness run begins with a fresh login round
 * trip — guards against stale-cookie false negatives.
 */
export function purgeAdminStorageState(): void {
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    fs.unlinkSync(STORAGE_STATE_PATH)
  }
}

export const STORAGE_STATE_FILE = STORAGE_STATE_PATH

/**
 * Extended test fixture that exposes resolved env-derived inputs:
 *   - `adminEmail` / `adminPassword` — from env, fails loudly if missing
 *   - `backendUrl` — GP backend URL
 *
 * The storage state lifecycle (create on `beforeAll`, purge on `afterAll`)
 * is owned by the spec, not by a per-test Playwright fixture, because every
 * test in this suite shares the same login round trip.
 */
export const test = base.extend<{
  adminEmail: string
  adminPassword: string
  backendUrl: string
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
})

export { expect }
