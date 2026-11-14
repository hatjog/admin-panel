// @vitest-environment node
/**
 * Story v1.16.0 7.8 AC1 + AC2 (UI) — six distinguishable projection states,
 * HTTP error classes preserved, read-only never offers write/activation.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  classifyMarketConfigResponse,
  type MarketConfigUiState,
  type TransportOutcome,
} from "../market-config-state"

const json = (status: number, body: unknown): TransportOutcome => ({
  kind: "response",
  status,
  contentType: "application/json; charset=utf-8",
  bodyText: JSON.stringify(body),
})

const SIX_STATES: Array<[string, TransportOutcome, MarketConfigUiState]> = [
  ["pending", { kind: "pending" }, "loading"],
  ["200 empty", json(200, { state: "empty", empty: true, read_only: false, config: {} }), "empty"],
  ["403", { kind: "http_error", status: 403 }, "forbidden"],
  ["200 stale", json(200, { state: "stale", stale: true, stale_reason: "provenance_missing", config: {} }), "stale"],
  ["404", { kind: "http_error", status: 404 }, "invalid_context"],
  ["500", { kind: "http_error", status: 500 }, "backend_error"],
]

describe("Story 7.8 AC1 — distinguishable states", () => {
  it.each(SIX_STATES)("%s -> %s", (_label, outcome, expected) => {
    expect(classifyMarketConfigResponse(outcome).state).toBe(expected)
  })

  it("each of the six states has a distinct message key and a distinct remediation action", () => {
    const views = SIX_STATES.map(([, outcome]) => classifyMarketConfigResponse(outcome))
    expect(new Set(views.map((v) => v.state)).size).toBe(6)
    expect(new Set(views.map((v) => v.messageKey)).size).toBe(6)
    expect(new Set(views.map((v) => v.action)).size).toBe(6)
    for (const v of views) {
      expect(v.action).not.toBe("none")
      expect(v.actionKey).toBe(`operator.market_config.states.${v.state}.action`)
    }
  })

  it("message and action keys exist in en.json and pl.json", () => {
    const dir = path.resolve(__dirname, "../../../../i18n/translations")
    for (const file of ["en.json", "pl.json"]) {
      const tr = JSON.parse(readFileSync(path.join(dir, file), "utf-8"))
      for (const [, outcome] of SIX_STATES) {
        const v = classifyMarketConfigResponse(outcome)
        const get = (key: string) => key.split(".").reduce((o: any, k) => o?.[k], tr)
        expect(typeof get(v.messageKey), `${file}:${v.messageKey}`).toBe("string")
        expect(typeof get(v.actionKey as string), `${file}:${v.actionKey}`).toBe("string")
        expect(typeof get(`operator.market_config.states.${v.state}.title`)).toBe("string")
      }
    }
  })

  it.each<[string, TransportOutcome, MarketConfigUiState, string | null]>([
    ["401", { kind: "http_error", status: 401 }, "forbidden", null],
    ["403", { kind: "http_error", status: 403 }, "forbidden", null],
    ["400", { kind: "http_error", status: 400 }, "invalid_context", null],
    ["404", { kind: "http_error", status: 404 }, "invalid_context", null],
    ["500", { kind: "http_error", status: 500 }, "backend_error", "server_error"],
    ["502", { kind: "http_error", status: 502 }, "backend_error", "server_error"],
    ["503 raw", json(503, { state: "projection_error" }), "backend_error", "server_error"],
    ["404 raw with reason", json(404, { state: "invalid_context", reason: "market_not_found" }), "invalid_context", null],
    ["200 non-JSON html", { kind: "response", status: 200, contentType: "text/html", bodyText: "<html></html>" }, "backend_error", "non_json"],
    ["200 declared JSON but broken", { kind: "response", status: 200, contentType: "application/json", bodyText: "{oops" }, "backend_error", "non_json"],
    ["200 empty body", { kind: "response", status: 200, contentType: null, bodyText: "" }, "backend_error", "non_json"],
    ["200 JSON array", json(200, []), "backend_error", "unexpected_payload"],
    ["200 {} (no state)", json(200, {}), "backend_error", "unexpected_payload"],
    ["200 ok without config", json(200, { state: "ok" }), "backend_error", "unexpected_payload"],
    ["200 empty without empty:true", json(200, { state: "empty" }), "backend_error", "unexpected_payload"],
    ["200 projection_error state", json(200, { state: "projection_error" }), "backend_error", "unexpected_payload"],
    ["network", { kind: "network_error" }, "backend_error", "network"],
  ])("%s keeps its class (never empty)", (_l, outcome, expected, errorClass) => {
    const v = classifyMarketConfigResponse(outcome)
    expect(v.state).toBe(expected)
    expect(v.state).not.toBe("empty")
    expect(v.errorClass).toBe(errorClass)
  })

  it("only an explicit 200 JSON state:empty + empty:true yields empty", () => {
    expect(classifyMarketConfigResponse(json(200, { state: "empty", empty: true })).state).toBe("empty")
  })

  it("stale carries the backend reason", () => {
    const v = classifyMarketConfigResponse(json(200, { state: "stale", stale_reason: "projection_digest_mismatch", config: null }))
    expect(v.reason).toBe("projection_digest_mismatch")
  })

  it("negative control: a mutant mapping every error to empty is caught by this table", () => {
    const mutant = (o: TransportOutcome) => {
      const v = classifyMarketConfigResponse(o)
      return v.state === "backend_error" || v.state === "forbidden" || v.state === "invalid_context" ? "empty" : v.state
    }
    const caught = SIX_STATES.filter(([, o, expected]) => mutant(o) !== expected)
    expect(caught.map(([l]) => l)).toEqual(["403", "404", "500"])
  })
})

describe("Story 7.8 AC2 — read-only never offers write/activation", () => {
  it("read_only: true -> allowWriteActions false even for ok", () => {
    const v = classifyMarketConfigResponse(json(200, { state: "ok", read_only: true, config: { market_id: "testmarketb" } }))
    expect(v.state).toBe("ok")
    expect(v.readOnly).toBe(true)
    expect(v.allowWriteActions).toBe(false)
  })

  it("missing read_only flag fails closed to read-only", () => {
    const v = classifyMarketConfigResponse(json(200, { state: "ok", config: { a: 1 } }))
    expect(v.readOnly).toBe(true)
    expect(v.allowWriteActions).toBe(false)
  })

  it("no state other than ok with read_only:false allows write actions", () => {
    for (const [, o] of SIX_STATES) expect(classifyMarketConfigResponse(o).allowWriteActions).toBe(false)
  })

  it("screen and transport issue no write or activation calls", () => {
    const dir = path.resolve(__dirname, "..")
    for (const file of ["market-config-page.tsx", "market-config-api.ts"]) {
      const src = readFileSync(path.join(dir, file), "utf-8")
      expect(src).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/)
      expect(src).not.toMatch(/flag-?flip|flagFlip|payment|activate\(/i)
    }
  })
})
