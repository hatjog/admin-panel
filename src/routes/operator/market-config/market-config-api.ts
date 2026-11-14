/**
 * Story v1.16.0 7.8 — transport for GET /admin/operator/market-config.
 *
 * Does NOT go through `sdk.client.fetch`: js-sdk 2.14.2 (`normalizeResponse`)
 * consumes every non-2xx body and throws `FetchError(message, statusText,
 * status)`, dropping the backend `reason` / `code` (market_not_found,
 * market_id_invalid, market_config_invalid_yaml, read_only_market, ...).
 * Instead the raw Response is read for every status, with the same auth the
 * SDK would attach (Bearer JWT from the SDK token store, session cookies via
 * `credentials: "include"`), so the classifier sees status + content-type +
 * body for 2xx and non-2xx alike.
 */
import { backendUrl, sdk } from "@/lib/client"
import type { TransportOutcome } from "./market-config-state"

export type MarketConfigTransportDeps = {
  fetchImpl: typeof fetch
  getToken: () => Promise<string | null | undefined>
  baseUrl: string
}

const defaultDeps = (): MarketConfigTransportDeps => ({
  fetchImpl: (input, init) => globalThis.fetch(input, init),
  getToken: () => sdk.client.getToken(),
  baseUrl: backendUrl,
})

export function buildMarketConfigUrl(baseUrl: string, marketId: string): string {
  const base = baseUrl.replace(/\/+$/, "")
  return `${base}/admin/operator/market-config?market_id=${encodeURIComponent(marketId)}`
}

export async function fetchMarketConfigOutcome(
  marketId: string,
  deps: MarketConfigTransportDeps = defaultDeps()
): Promise<TransportOutcome> {
  let response: Response
  try {
    const token = await deps.getToken()
    const headers: Record<string, string> = { accept: "application/json, */*" }
    if (token) headers.authorization = `Bearer ${token}`
    response = await deps.fetchImpl(buildMarketConfigUrl(deps.baseUrl, marketId), {
      method: "GET",
      headers,
      credentials: "include",
    })
  } catch (error) {
    console.warn("[market-config] transport failure", error)
    return { kind: "network_error" }
  }
  let bodyText = ""
  try {
    bodyText = await response.text()
  } catch (error) {
    // Body unreadable: keep the status (never degrade to empty); classifier marks non_json / status class.
    console.warn("[market-config] response body unreadable", error)
    bodyText = ""
  }
  return {
    kind: "response",
    status: response.status,
    contentType: response.headers.get("content-type"),
    bodyText,
  }
}
