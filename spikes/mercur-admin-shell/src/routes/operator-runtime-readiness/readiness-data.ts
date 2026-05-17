export const operatorRuntimeReadinessData = {
  record_type: "operator_runtime_readiness_data",
  release_id: "v1.7.0",
  release_blocked: 1,
  active_story_1_1_evidence:
    "_bmad-output/releases/v1.7.0/implementation-artifacts/evidence/v1.7.0.global.admin-dashboard-runtime-candidate.fail.json",
  blockers: [
    {
      path: "/sellers",
      registry_decision: "deferred",
      evidence:
        "specs/releases/v1.7.0/release-exceptions/REX-V170-ADMIN-RUNTIME-SELLERS.release-exception.json",
    },
    {
      path: "/commission-rates",
      registry_decision: "deferred",
      evidence:
        "specs/releases/v1.7.0/release-exceptions/REX-V170-ADMIN-RUNTIME-COMMISSION-RATES.release-exception.json",
    },
    {
      path: "/marketplace",
      registry_decision: "deferred",
      evidence:
        "specs/releases/v1.7.0/release-exceptions/REX-V170-ADMIN-RUNTIME-MARKETPLACE.release-exception.json",
    },
  ],
  runtime_routes: {
    total: 8,
    pass: 5,
    blocked: 3,
  },
  story_status_separation:
    "Story 1.5 exposes readiness evidence only; Story 1.1 remains blocked until residual routes are resolved.",
} as const

