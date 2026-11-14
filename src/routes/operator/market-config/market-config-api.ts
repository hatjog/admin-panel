/**
 * Story v1.16.0 7.8 — transport for GET /admin/operator/market-config.
 *
 * Requests with `accept: *\/*` so the js-sdk returns the raw Response for 2xx
 * (no implicit JSON parse that would hide a non-JSON body); non-2xx arrive as
 * FetchError carrying the HTTP status. Both are mapped to a TransportOutcome
 * so the classifier keeps the error class.
 */
import { sdk } from "@/lib/client"
import { isFetchError } from "@/lib/is-fetch-error"
import type { TransportOutcome } from "./market-config-state"

export async function fetchMarketConfigOutcome(marketId: string): Promise<TransportOutcome> {
  try {
    const response = await sdk.client.fetch<Response>("/admin/operator/market-config", {
      method: "GET",
      query: { market_id: marketId },
      headers: { accept: "*/*" },
    })
    return {
      kind: "response",
      status: response.status,
      contentType: response.headers.get("content-type"),
      bodyText: await response.text(),
    }
  } catch (error) {
    if (isFetchError(error) && typeof error.status === "number") {
      return { kind: "http_error", status: error.status }
    }
    console.warn("[market-config] transport failure", error)
    return { kind: "network_error" }
  }
}
