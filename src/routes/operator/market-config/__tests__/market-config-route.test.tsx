// @vitest-environment node
/**
 * Story v1.16.0 7.8 — checkpoint fix (HIGH): the screen must be mounted.
 *
 * 1. `/operator/market-config` is an entry of the real router map (`getRouteMap`),
 *    resolved through its `lazy` import to the page component.
 * 2. The sidebar nav (`useCoreRoutes`, same mechanism as the other GP screens) links to it.
 * 3. The page, rendered inside a memory router at that path, goes through the real
 *    transport (`fetchMarketConfigOutcome` with a fake `fetch`) and renders each state
 *    distinctly: loading / empty / forbidden (401 vs 403) / stale / invalid-context / backend-error.
 * 4. The non-2xx body reaches the UI (`reason` / `code`), which js-sdk FetchError drops.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { renderToString } from "react-dom/server"
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

type LazyFn = () => Promise<{ Component?: React.ComponentType }>
const resolveLazy = (route: RouteObject) => (route.lazy as unknown as LazyFn)()

import { getRouteMap } from "../../../../dashboard-app/routes/get-route.map"
import { useCoreRoutes } from "../../../../components/layout/main-layout/main-layout"
import { fetchMarketConfigOutcome, type MarketConfigTransportDeps } from "../market-config-api"
import { classifyMarketConfigResponse } from "../market-config-state"

const PATH = "/operator/market-config"

function findRoute(routes: RouteObject[], path: string): RouteObject | undefined {
  for (const r of routes) {
    if (r.path === path) return r
    const hit = r.children ? findRoute(r.children, path) : undefined
    if (hit) return hit
  }
  return undefined
}

const fakeDeps = (status: number, body: unknown, contentType = "application/json; charset=utf-8") => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const deps: MarketConfigTransportDeps = {
    baseUrl: "http://backend.test/",
    getToken: async () => "jwt-token",
    fetchImpl: (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const text = typeof body === "string" ? body : JSON.stringify(body)
      return new Response(text, { status, headers: { "content-type": contentType } })
    }) as unknown as typeof fetch,
  }
  return { deps, calls }
}

async function renderPageAt(entry: string, prime?: { status: number; body: unknown; contentType?: string }) {
  const route = findRoute(getRouteMap({ settingsRoutes: [], coreRoutes: [] }) as RouteObject[], PATH)
  expect(route, "route entry missing from getRouteMap").toBeDefined()
  const mod = await resolveLazy(route!)
  expect(mod.Component).toBeTypeOf("function")
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const marketId = new URL(entry, "http://x").searchParams.get("market_id")
  let calls: Array<{ url: string; init?: RequestInit }> = []
  if (prime && marketId) {
    const f = fakeDeps(prime.status, prime.body, prime.contentType)
    calls = f.calls
    // Real transport, fake network: the query cache gets exactly what the page's queryFn would.
    await qc.prefetchQuery({
      queryKey: ["admin-operator-market-config", marketId],
      queryFn: () => fetchMarketConfigOutcome(marketId, f.deps),
    })
  }
  const router = createMemoryRouter([{ path: PATH, Component: mod.Component }], { initialEntries: [entry] })
  const html = renderToString(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { html, calls }
}

const attr = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? null

describe("Story 7.8 fix — route is mounted in the real router map", () => {
  it("getRouteMap contains /operator/market-config with errorElement and a lazy page", async () => {
    const route = findRoute(getRouteMap({ settingsRoutes: [], coreRoutes: [] }) as RouteObject[], PATH)
    expect(route).toBeDefined()
    expect(route!.errorElement).toBeTruthy()
    const mod = await resolveLazy(route!)
    expect(mod.Component).toBeTypeOf("function")
  })

  it("sidebar nav (useCoreRoutes) links to /operator/market-config", () => {
    let paths: string[] = []
    const Probe = () => {
      paths = useCoreRoutes().map((r) => r.to)
      return null
    }
    renderToString(<Probe />)
    expect(paths).toContain(PATH)
  })
})

describe("Story 7.8 fix — page renders every state inside the router through the real transport", () => {
  it("no market selected: form only, no state panel, no request", async () => {
    const { html } = await renderPageAt(PATH)
    expect(html).toContain("operator.market_config.title")
    expect(attr(html, "data-state")).toBeNull()
  })

  it("loading: market selected, response not yet arrived", async () => {
    const { html } = await renderPageAt(`${PATH}?market_id=bonbeauty`)
    expect(attr(html, "data-state")).toBe("loading")
  })

  it.each<[string, number, unknown, string, string, string | null]>([
    ["empty", 200, { state: "empty", empty: true, read_only: false, config: {} }, "empty", "run_config_load", null],
    ["stale", 200, { state: "stale", stale: true, stale_reason: "provenance_missing", config: { a: 1 } }, "stale", "rerun_config_load", "provenance_missing"],
    ["403 forbidden", 403, { state: "forbidden", code: "scope_required", market_id: "bonbeauty" }, "forbidden", "request_grant", "scope_required"],
    ["403 read-only", 403, { state: "forbidden", code: "read_only_market", market_id: "testmarketb" }, "forbidden", "request_grant", "read_only_market"],
    ["401 session expired", 401, { message: "Unauthorized" }, "forbidden", "sign_in", null],
    ["404 invalid-context", 404, { state: "invalid_context", code: "invalid_context", reason: "market_not_found" }, "invalid_context", "switch_market", "market_not_found"],
    ["400 invalid-context", 400, { state: "invalid_context", code: "invalid_context", reason: "market_id_invalid" }, "invalid_context", "switch_market", "market_id_invalid"],
    ["503 backend-error", 503, { state: "projection_error", code: "projection_error", reason: "market_config_invalid_yaml" }, "backend_error", "retry", "market_config_invalid_yaml"],
    ["200 html backend-error", 200, "<html>proxy</html>", "backend_error", "retry", null],
  ])("%s", async (_l, status, body, state, action, reason) => {
    const ct = typeof body === "string" ? "text/html" : undefined
    const { html, calls } = await renderPageAt(`${PATH}?market_id=bonbeauty`, { status, body, contentType: ct })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe("http://backend.test/admin/operator/market-config?market_id=bonbeauty")
    expect(calls[0].init?.method).toBe("GET")
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer jwt-token")
    expect(attr(html, "data-state")).toBe(state)
    expect(attr(html, "data-action")).toBe(action)
    if (state !== "empty") expect(html).not.toContain('data-state="empty"')
    if (reason) expect(html).toContain(reason)
    if (action === "sign_in") expect(html).toContain("operator.market_config.states.forbidden.action_sign_in")
    if (action === "request_grant") expect(html).toContain("operator.market_config.states.forbidden.action<")
  })
})

describe("Story 7.8 fix — error body survives the transport (js-sdk FetchError drops it)", () => {
  it("js-sdk FetchError carries only message/statusText/status — no reason field", () => {
    const err = new FetchError("Not Found", "Not Found", 404) as unknown as Record<string, unknown>
    expect(err.status).toBe(404)
    expect(err.reason).toBeUndefined()
    expect(err.body).toBeUndefined()
  })

  it("transport returns status + body for non-2xx so reason reaches the classifier", async () => {
    const { deps } = fakeDeps(404, { state: "invalid_context", reason: "market_not_found" })
    const outcome = await fetchMarketConfigOutcome("nope", deps)
    expect(outcome).toMatchObject({ kind: "response", status: 404 })
    const v = classifyMarketConfigResponse(outcome)
    expect(v.state).toBe("invalid_context")
    expect(v.reason).toBe("market_not_found")
  })

  it("network failure stays backend_error/network, never empty", async () => {
    const deps: MarketConfigTransportDeps = {
      baseUrl: "/",
      getToken: async () => null,
      fetchImpl: (async () => {
        throw new TypeError("Failed to fetch")
      }) as unknown as typeof fetch,
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const v = classifyMarketConfigResponse(await fetchMarketConfigOutcome("x", deps))
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
    expect(v.state).toBe("backend_error")
    expect(v.errorClass).toBe("network")
  })

  it("401 and 403 map to different remediation actions", () => {
    const a = classifyMarketConfigResponse({ kind: "response", status: 401, contentType: "application/json", bodyText: "{}" })
    const b = classifyMarketConfigResponse({ kind: "response", status: 403, contentType: "application/json", bodyText: "{}" })
    expect(a.state).toBe("forbidden")
    expect(b.state).toBe("forbidden")
    expect(a.action).toBe("sign_in")
    expect(b.action).toBe("request_grant")
    expect(a.actionKey).not.toBe(b.actionKey)
  })
})
