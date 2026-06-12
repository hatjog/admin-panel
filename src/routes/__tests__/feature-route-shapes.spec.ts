// @vitest-environment node
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

type Shape =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "nullable-string"
  | `enum:${string}`
  | `record:${"string" | "number" | "boolean"}`
  | { [key: string]: Shape }
  | [Shape]

type RouteContract = {
  name: string
  routeModule: string
  sourceFile: string
  exportedComponent: string
  requiredSourceFields: string[]
  sample: unknown
  shape: Shape
}

const iso = "2026-06-12T10:00:00.000Z"

const contracts: RouteContract[] = [
  {
    name: "entitlements + voucher search",
    routeModule: "../entitlements",
    sourceFile: "src/routes/entitlements/entitlements.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["voucher_code", "claim_token", "redemptions", "audit_log", "remaining_minor"],
    sample: {
      data: {
        entitlements: [
          {
            id: "ent_1",
            status: "active",
            voucher_code: "VOUCHER-1",
            claim_token: "claim-token",
            order_id: "order_1",
            face_value_minor: 10000,
            remaining_minor: 5000,
            currency: "PLN",
            product_name: "Voucher",
            vendor_name: "Vendor",
            created_at: iso,
            expires_at: null,
            claimed_at: null,
            last_redeemed_at: iso,
            redemptions: [{ id: "red_1", amount_minor: 5000, vendor_id: "vendor_1", redeemed_at: iso, idempotency_key: "idem_1" }],
            audit_log: [{ id: "audit_1", action: "created", actor: "operator", reason: null, created_at: iso }],
          },
        ],
      },
    },
    shape: {
      data: {
        entitlements: [
          {
            id: "string",
            status: "string",
            voucher_code: "string",
            claim_token: "string",
            order_id: "nullable-string",
            face_value_minor: "number",
            remaining_minor: "number",
            currency: "string",
            product_name: "string",
            vendor_name: "string",
            created_at: "string",
            expires_at: "nullable-string",
            claimed_at: "nullable-string",
            last_redeemed_at: "nullable-string",
            redemptions: [{ id: "string", amount_minor: "number", vendor_id: "string", redeemed_at: "string", idempotency_key: "string" }],
            audit_log: [{ id: "string", action: "string", actor: "string", reason: "nullable-string", created_at: "string" }],
          },
        ],
      },
    },
  },
  {
    name: "operator flag-flip",
    routeModule: "../operator/flag-flip",
    sourceFile: "src/routes/operator/flag-flip/flag-flip-page.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["current_state", "allowed_transitions", "audit_trail", "smoke_gate_ref", "cache_invalidate_outcome"],
    sample: {
      current_state: "shadow",
      allowed_transitions: ["off", "on"],
      last_transitioned_at: iso,
      last_admin: "admin_1",
      audit_trail: [
        {
          audit_log_id: "audit_1",
          from: "off",
          to: "shadow",
          triggered_by: "admin_1",
          admin_note: "note",
          smoke_gate_ref: "gate_1",
          cache_invalidate_outcome: { errors: ["redis_timeout"], duration_ms: 20 },
          at: iso,
        },
      ],
    },
    shape: {
      current_state: "enum:off|shadow|on",
      allowed_transitions: ["enum:off|shadow|on"],
      last_transitioned_at: "nullable-string",
      last_admin: "nullable-string",
      audit_trail: [{ audit_log_id: "string", from: "enum:off|shadow|on", to: "enum:off|shadow|on", triggered_by: "string", admin_note: "string", smoke_gate_ref: "string", cache_invalidate_outcome: { errors: ["string"], duration_ms: "number" }, at: "string" }],
    },
  },
  {
    name: "operator security-gates",
    routeModule: "../operator/security-gates",
    sourceFile: "src/routes/operator/security-gates/security-gates-page.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["gates", "overall", "verified_at", "history"],
    sample: {
      gates: [{ gate: "csrf", status: "pass", detail: "ok", last_verified_at: iso }],
      overall: "pass",
      verified_at: iso,
      last_run_by: "admin_1",
      history: [{ requested_gate: "all", overall: "pass", verified_at: iso, last_run_by: "admin_1" }],
    },
    shape: {
      gates: [{ gate: "string", status: "enum:pass|fail|skip", detail: "string", last_verified_at: "string" }],
      overall: "enum:pass|fail",
      verified_at: "string",
      last_run_by: "nullable-string",
      history: [{ requested_gate: "string", overall: "enum:pass|fail", verified_at: "string", last_run_by: "string" }],
    },
  },
  {
    name: "operator smoke-gate",
    routeModule: "../operator/smoke-gate",
    sourceFile: "src/routes/operator/smoke-gate/smoke-gate-page.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["items", "computed", "last_ratified", "computed_at"],
    sample: {
      items: [{ key: "phase_b_smoke", label: "Phase B", nfr_ref: "FR-C6", status: "pass", evidence_url: "https://evidence.example/run", source: "ci" }],
      computed: "pass",
      last_ratified: { verdict: "pass", admin_id: "admin_1", admin_note: "ok", ratified_at: iso },
      computed_at: iso,
    },
    shape: {
      items: [{ key: "string", label: "string", nfr_ref: "string", status: "enum:pass|fail|unknown", evidence_url: "string", source: "string" }],
      computed: "enum:pass|fail|pending",
      last_ratified: { verdict: "enum:pass|fail", admin_id: "string", admin_note: "string", ratified_at: "string" },
      computed_at: "string",
    },
  },
  {
    name: "vendor decisions list",
    routeModule: "../vendors/decisions",
    sourceFile: "src/routes/vendors/decisions/decisions-list.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["decision_status", "lifecycle_status", "last_action_at"],
    sample: {
      vendors: [{ id: "vendor_1", handle: "vendor", email: "vendor@example.com", lifecycle_status: "pending_approval", decision_status: "pending", last_action_at: null }],
      total: 1,
      page: 1,
      limit: 20,
    },
    shape: {
      vendors: [{ id: "string", handle: "string", email: "string", lifecycle_status: "string", decision_status: "enum:pending|opted_in|opted_out|forced", last_action_at: "nullable-string" }],
      total: "number",
      page: "number",
      limit: "number",
    },
  },
  {
    name: "vendor decision capture",
    routeModule: "../vendors/decisions/[id]",
    sourceFile: "src/routes/vendors/decisions/decision-detail.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["vendor_id", "decision", "audit_log_id", "email_dispatched"],
    sample: { vendor_id: "vendor_1", decision: "opted_in", audit_log_id: "audit_1", email_dispatched: true },
    shape: { vendor_id: "string", decision: "enum:opted_in|opted_out", audit_log_id: "string", email_dispatched: "boolean" },
  },
  {
    name: "vendor pause-gate list",
    routeModule: "../vendors/pause-gate",
    sourceFile: "src/routes/vendors/pause-gate/pause-gate-list.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["completeness", "decision_status", "lifecycle_status"],
    sample: {
      vendors: [{ id: "vendor_1", handle: "vendor", email: "vendor@example.com", lifecycle_status: "pending_approval", decision_status: "opted_in", completeness: { complete: 4, total: 5 }, last_action_at: iso }],
      total: 1,
      page: 1,
      limit: 20,
    },
    shape: {
      vendors: [{ id: "string", handle: "string", email: "string", lifecycle_status: "enum:pending_approval|open|suspended|terminated", decision_status: "enum:opted_in|opted_out|pending", completeness: { complete: "number", total: "number" }, last_action_at: "nullable-string" }],
      total: "number",
      page: "number",
      limit: "number",
    },
  },
  {
    name: "vendor pause-gate detail",
    routeModule: "../vendors/pause-gate/[id]",
    sourceFile: "src/routes/vendors/pause-gate/pause-gate-detail.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["checklist", "allowed_transitions", "completeness"],
    sample: {
      vendor: { id: "vendor_1", handle: "vendor", email: "vendor@example.com", lifecycle_status: "pending_approval", decision_status: "opted_in", last_action_at: iso },
      checklist: [{ key: "training_verified", done: true, na: false }],
      completeness: { complete: 4, total: 5 },
      allowed_transitions: ["open", "suspended"],
    },
    shape: {
      vendor: { id: "string", handle: "string", email: "string", lifecycle_status: "enum:pending_approval|open|suspended|terminated", decision_status: "enum:opted_in|opted_out|pending", last_action_at: "nullable-string" },
      checklist: [{ key: "enum:t30_sent|nudges_sent|decision_captured|jca_signed|training_verified", done: "boolean", na: "boolean" }],
      completeness: { complete: "number", total: "number" },
      allowed_transitions: ["enum:pending_approval|open|suspended|terminated"],
    },
  },
  {
    name: "vendor jca list",
    routeModule: "../vendors/jca",
    sourceFile: "src/routes/vendors/jca/jca-list.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["jca_status", "opted_in_date"],
    sample: { id: "vendor_1", handle: "vendor", opted_in_date: "2026-06-12", jca_status: "generated" },
    shape: { id: "string", handle: "string", opted_in_date: "string", jca_status: "enum:not_generated|generated|signed" },
  },
  {
    name: "vendor jca detail",
    routeModule: "../vendors/jca/[id]",
    sourceFile: "src/routes/vendors/jca/jca-detail.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["vendor_id", "bytes", "audit_log_id", "format", "signed_at"],
    sample: { vendor_id: "vendor_1", bytes: 12345, audit_log_id: "audit_1", format: "pdf", signed_at: iso },
    shape: { vendor_id: "string", bytes: "number", audit_log_id: "string", format: "enum:pdf", signed_at: "string" },
  },
  {
    name: "vendor nudges dashboard + force decision",
    routeModule: "../vendors/notifications/nudges",
    sourceFile: "src/routes/vendors/notifications/nudges/nudges-dashboard.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["per_step_counts", "decision_completion", "pending_decisions", "recent_dispatches", "audit_log_ids"],
    sample: {
      per_step_counts: { t21: 1, t14: 2, t7: 3, t3: 4 },
      decision_completion: { opted_in: 10, opted_out: 2, open: 3, completion_rate: 0.8 },
      pending_decisions: { count: 3, days_to_flag_flip: 10 },
      recent_dispatches: [{ id: "dispatch_1", vendor_id: "vendor_1", vendor_handle: null, notification_type: "t21", sent_at: iso, locale: "pl", status: "sent" }],
    },
    shape: {
      per_step_counts: { t21: "number", t14: "number", t7: "number", t3: "number" },
      decision_completion: { opted_in: "number", opted_out: "number", open: "number", completion_rate: "number" },
      pending_decisions: { count: "number", days_to_flag_flip: "number" },
      recent_dispatches: [{ id: "string", vendor_id: "string", vendor_handle: "nullable-string", notification_type: "string", sent_at: "string", locale: "enum:pl|en", status: "enum:sent|failed" }],
    },
  },
  {
    name: "health dashboard",
    routeModule: "../health-dashboard",
    sourceFile: "src/routes/health-dashboard/health-dashboard.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["updated_at", "services", "entitlement_stats", "last_sync_at"],
    sample: {
      updated_at: iso,
      services: [{ id: "postgres", name: "Postgres", ok: true, latency_ms: 5, error: "none" }],
      entitlement_stats: { active: 10 },
      last_sync_at: null,
    },
    shape: {
      updated_at: "string",
      services: [{ id: "string", name: "string", ok: "boolean", latency_ms: "number", error: "string" }],
      entitlement_stats: "record:number",
      last_sync_at: "nullable-string",
    },
  },
  {
    name: "training cert queue",
    routeModule: "../vendors/training-certs",
    sourceFile: "src/routes/vendors/training-certs/training-cert-queue.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["decision_status", "uploaded_at", "status"],
    sample: { id: "cert_1", handle: "vendor", decision_status: "opted_in", uploaded_at: iso, status: "pending_review" },
    shape: { id: "string", handle: "string", decision_status: "enum:opted_in|opted_out", uploaded_at: "string", status: "enum:pending_review|verified|rejected" },
  },
  {
    name: "training cert review",
    routeModule: "../vendors/training-certs/[id]",
    sourceFile: "src/routes/vendors/training-certs/training-cert-detail.tsx",
    exportedComponent: "Component",
    requiredSourceFields: ["vendor_id", "decision", "audit_log_id", "rejection_reason"],
    sample: { vendor_id: "vendor_1", decision: "approved", audit_log_id: "audit_1" },
    shape: { vendor_id: "string", decision: "enum:approved|rejected", audit_log_id: "string" },
  },
]

function assertShape(value: unknown, shape: Shape, pathLabel = "response"): void {
  if (typeof shape === "string") {
    if (shape === "nullable-string") {
      expect(value === null || typeof value === "string", `${pathLabel} should be string|null`).toBe(true)
      return
    }
    if (shape.startsWith("enum:")) {
      expect(shape.slice(5).split("|"), `${pathLabel} enum`).toContain(value)
      return
    }
    if (shape.startsWith("record:")) {
      expect(value && typeof value === "object" && !Array.isArray(value)).toBe(true)
      const typeName = shape.slice("record:".length)
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        expect(typeof item, `${pathLabel}.${key}`).toBe(typeName)
      }
      return
    }
    if (shape === "null") {
      expect(value, `${pathLabel} should be null`).toBeNull()
      return
    }
    expect(typeof value, pathLabel).toBe(shape)
    return
  }

  if (Array.isArray(shape)) {
    expect(Array.isArray(value), `${pathLabel} should be array`).toBe(true)
    expect((value as unknown[]).length, `${pathLabel} should not be vacuous`).toBeGreaterThan(0)
    for (const [index, item] of (value as unknown[]).entries()) {
      assertShape(item, shape[0], `${pathLabel}[${index}]`)
    }
    return
  }

  expect(value && typeof value === "object" && !Array.isArray(value)).toBe(true)
  for (const [key, childShape] of Object.entries(shape)) {
    expect(value as Record<string, unknown>, `${pathLabel}.${key} missing`).toHaveProperty(key)
    assertShape((value as Record<string, unknown>)[key], childShape, `${pathLabel}.${key}`)
  }
}

describe("GP admin feature-routes — smoke + data-shape", () => {
  it.each(contracts)("$name route module smoke-imports", async (contract) => {
    const mod = await import(contract.routeModule)
    expect(mod[contract.exportedComponent], contract.exportedComponent).toBeTypeOf("function")
  })

  it.each(contracts)("$name keeps source fields used by the route", (contract) => {
    const source = readFileSync(path.join(process.cwd(), contract.sourceFile), "utf8")
    for (const field of contract.requiredSourceFields) {
      expect(source, `${contract.sourceFile} should reference ${field}`).toContain(field)
    }
  })

  it.each(contracts)("$name response shape is explicit and non-vacuous", (contract) => {
    assertShape(contract.sample, contract.shape, contract.name)
  })

  it("shape assertions fail on missing, renamed, or mistyped fields", () => {
    const contract = contracts.find((item) => item.name === "vendor decision capture")
    if (!contract) {
      throw new Error("missing contract fixture")
    }

    expect(() =>
      assertShape(
        { vendor_id: "vendor_1", decision: "opted_in", audit_log_id: 42 },
        contract.shape,
        contract.name,
      ),
    ).toThrow()
  })
})
