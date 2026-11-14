/**
 * Story v1.16.0 7.8 — pure classifier of the market-config projection response.
 *
 * Input is the transport outcome (status, content-type, body text) of
 * `GET /admin/operator/market-config`; output is one of six distinguishable UI
 * states, each with its own message key and remediation action. A failure is
 * NEVER classified as `empty`: 403 stays forbidden, 404 stays invalid-context,
 * 5xx / non-JSON / unknown payload stays backend-error. Only a 200 JSON body
 * with `state: "empty"` produces `empty`.
 */

export type MarketConfigUiState =
  | "loading"
  | "ok"
  | "empty"
  | "forbidden"
  | "stale"
  | "invalid_context"
  | "backend_error"

export type RemediationAction =
  | "none"
  | "wait"
  | "run_config_load"
  | "rerun_config_load"
  | "request_grant"
  | "sign_in"
  | "switch_market"
  | "retry"

export type BackendErrorClass = "server_error" | "non_json" | "unexpected_payload" | "network" | "unexpected_status"

export type TransportOutcome =
  | { kind: "pending" }
  | { kind: "response"; status: number; contentType: string | null; bodyText: string }
  | { kind: "http_error"; status: number }
  | { kind: "network_error" }

export type MarketConfigView = {
  state: MarketConfigUiState
  messageKey: string
  action: RemediationAction
  actionKey: string | null
  readOnly: boolean
  /** Write / activation affordances are only ever offered for a non read-only, ok projection. */
  allowWriteActions: boolean
  httpStatus: number | null
  errorClass: BackendErrorClass | null
  reason: string | null
  config: Record<string, unknown> | null
}

const ACTION_BY_STATE: Record<MarketConfigUiState, RemediationAction> = {
  loading: "wait",
  ok: "none",
  empty: "run_config_load",
  forbidden: "request_grant",
  stale: "rerun_config_load",
  invalid_context: "switch_market",
  backend_error: "retry",
}

const KEY_PREFIX = "operator.market_config.states"

function view(
  state: MarketConfigUiState,
  extra: Partial<Omit<MarketConfigView, "state" | "messageKey" | "action" | "actionKey">> = {}
): MarketConfigView {
  const action = ACTION_BY_STATE[state]
  const readOnly = extra.readOnly ?? true
  return {
    state,
    messageKey: `${KEY_PREFIX}.${state}.message`,
    action,
    actionKey: action === "none" ? null : `${KEY_PREFIX}.${state}.action`,
    readOnly,
    allowWriteActions: state === "ok" && !readOnly,
    httpStatus: extra.httpStatus ?? null,
    errorClass: extra.errorClass ?? null,
    reason: extra.reason ?? null,
    config: extra.config ?? null,
  }
}

function classifyStatus(status: number): MarketConfigView {
  // 401 = expired / missing session -> sign in again; 403 = authenticated but no market grant.
  if (status === 401) {
    return {
      ...view("forbidden", { httpStatus: status }),
      action: "sign_in",
      actionKey: `${KEY_PREFIX}.forbidden.action_sign_in`,
    }
  }
  if (status === 403) return view("forbidden", { httpStatus: status })
  if (status === 400 || status === 404) return view("invalid_context", { httpStatus: status })
  if (status >= 500) return view("backend_error", { httpStatus: status, errorClass: "server_error" })
  return view("backend_error", { httpStatus: status, errorClass: "unexpected_status" })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function classifyMarketConfigResponse(outcome: TransportOutcome): MarketConfigView {
  switch (outcome.kind) {
    case "pending":
      return view("loading")
    case "network_error":
      return view("backend_error", { errorClass: "network" })
    case "http_error":
      return classifyStatus(outcome.status)
    case "response":
      break
  }

  const { status, contentType, bodyText } = outcome
  const isJson = (contentType ?? "").toLowerCase().includes("application/json")
  let body: unknown = undefined
  let parsed = false
  if (isJson) {
    try {
      body = JSON.parse(bodyText)
      parsed = true
    } catch {
      parsed = false
    }
  }

  if (status < 200 || status >= 300) {
    const base = classifyStatus(status)
    // Backend error bodies carry `reason` (invalid_context / projection_error) or only `code`
    // (forbidden: scope_required, read_only_market) — surface whichever is present.
    if (!isRecord(body)) return base
    const reason = typeof body.reason === "string" ? body.reason : typeof body.code === "string" ? body.code : null
    return reason ? { ...base, reason } : base
  }

  if (!parsed) return view("backend_error", { httpStatus: status, errorClass: "non_json" })
  if (!isRecord(body)) return view("backend_error", { httpStatus: status, errorClass: "unexpected_payload" })

  const readOnly = body.read_only === true ? true : body.read_only === false ? false : true
  const config = isRecord(body.config) ? body.config : null
  switch (body.state) {
    case "ok":
      if (!config) return view("backend_error", { httpStatus: status, errorClass: "unexpected_payload" })
      return view("ok", { httpStatus: status, readOnly, config })
    case "empty":
      if (body.empty !== true) return view("backend_error", { httpStatus: status, errorClass: "unexpected_payload" })
      return view("empty", { httpStatus: status, readOnly })
    case "stale":
      return view("stale", {
        httpStatus: status,
        readOnly,
        config,
        reason: typeof body.stale_reason === "string" ? body.stale_reason : null,
      })
    default:
      return view("backend_error", { httpStatus: status, errorClass: "unexpected_payload" })
  }
}
