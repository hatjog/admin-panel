/**
 * SSOT (single source of truth) kształtu odpowiedzi/loadera GP admin feature-routes (ra-16).
 *
 * Każdy kontrakt ma **runtime schema zod** (`.strict()`), który jest egzekwowany przez
 * `feature-route-shapes.spec.ts`. Schema — nie ręcznie autorski `sample`/`shape` literal — jest
 * SSOT kształtu: test data-shape parsuje `sample` przez schema (runtime walidacja), a `driftSample`
 * dowodzi, że schema FAILuje na shape-drift (brakujące / przemianowane / mistyped pole, nadmiarowe pole).
 *
 * `sourceAnchors` to distinctive snake_case pola kontraktu; każde MUSI być realnym kluczem w schemie
 * (egzekwowane w spec przez `collectFieldNames`) oraz obecne w pliku route (precyzyjny match `\bfield\b`),
 * więc rename realnego pola w route — albo w schemie — jest łapany jako drift.
 */
import { z } from 'zod';

const iso = '2026-06-12T10:00:00.000Z';

const flagStateEnum = z.enum(['off', 'shadow', 'on']);

/** entitlements + voucher search */
export const entitlementsSchema = z
  .object({
    data: z
      .object({
        entitlements: z
          .array(
            z
              .object({
                id: z.string(),
                status: z.string(),
                voucher_code: z.string(),
                claim_token: z.string(),
                order_id: z.string().nullable(),
                face_value_minor: z.number(),
                remaining_minor: z.number(),
                currency: z.string(),
                product_name: z.string(),
                vendor_name: z.string(),
                created_at: z.string(),
                expires_at: z.string().nullable(),
                claimed_at: z.string().nullable(),
                last_redeemed_at: z.string().nullable(),
                redemptions: z
                  .array(
                    z
                      .object({
                        id: z.string(),
                        amount_minor: z.number(),
                        vendor_id: z.string(),
                        redeemed_at: z.string(),
                        idempotency_key: z.string()
                      })
                      .strict()
                  )
                  .min(1),
                audit_log: z
                  .array(
                    z
                      .object({
                        id: z.string(),
                        action: z.string(),
                        actor: z.string(),
                        reason: z.string().nullable(),
                        created_at: z.string()
                      })
                      .strict()
                  )
                  .min(1)
              })
              .strict()
          )
          .min(1)
      })
      .strict()
  })
  .strict();

/** operator flag-flip */
export const flagFlipSchema = z
  .object({
    current_state: flagStateEnum,
    allowed_transitions: z.array(flagStateEnum).min(1),
    last_transitioned_at: z.string().nullable(),
    last_admin: z.string().nullable(),
    audit_trail: z
      .array(
        z
          .object({
            audit_log_id: z.string(),
            from: flagStateEnum,
            to: flagStateEnum,
            triggered_by: z.string(),
            admin_note: z.string(),
            smoke_gate_ref: z.string(),
            cache_invalidate_outcome: z
              .object({
                errors: z.array(z.string()).min(1),
                duration_ms: z.number()
              })
              .strict(),
            at: z.string()
          })
          .strict()
      )
      .min(1)
  })
  .strict();

/** operator security-gates */
export const securityGatesSchema = z
  .object({
    gates: z
      .array(
        z
          .object({
            gate: z.string(),
            status: z.enum(['pass', 'fail', 'skip']),
            detail: z.string(),
            last_verified_at: z.string()
          })
          .strict()
      )
      .min(1),
    overall: z.enum(['pass', 'fail']),
    verified_at: z.string(),
    last_run_by: z.string().nullable(),
    history: z
      .array(
        z
          .object({
            requested_gate: z.string(),
            overall: z.enum(['pass', 'fail']),
            verified_at: z.string(),
            last_run_by: z.string()
          })
          .strict()
      )
      .min(1)
  })
  .strict();

/** operator smoke-gate */
export const smokeGateSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            key: z.string(),
            label: z.string(),
            nfr_ref: z.string(),
            status: z.enum(['pass', 'fail', 'unknown']),
            evidence_url: z.string(),
            source: z.string()
          })
          .strict()
      )
      .min(1),
    computed: z.enum(['pass', 'fail', 'pending']),
    last_ratified: z
      .object({
        verdict: z.enum(['pass', 'fail']),
        admin_id: z.string(),
        admin_note: z.string(),
        ratified_at: z.string()
      })
      .strict(),
    computed_at: z.string()
  })
  .strict();

/** vendor decisions list */
export const decisionsListSchema = z
  .object({
    vendors: z
      .array(
        z
          .object({
            id: z.string(),
            handle: z.string(),
            email: z.string(),
            lifecycle_status: z.string(),
            decision_status: z.enum(['pending', 'opted_in', 'opted_out', 'forced']),
            last_action_at: z.string().nullable()
          })
          .strict()
      )
      .min(1),
    total: z.number(),
    page: z.number(),
    limit: z.number()
  })
  .strict();

/** vendor decision capture */
export const decisionCaptureSchema = z
  .object({
    vendor_id: z.string(),
    decision: z.enum(['opted_in', 'opted_out']),
    audit_log_id: z.string(),
    email_dispatched: z.boolean()
  })
  .strict();

const lifecycleEnum = z.enum(['pending_approval', 'open', 'suspended', 'terminated']);

/** vendor pause-gate list */
export const pauseGateListSchema = z
  .object({
    vendors: z
      .array(
        z
          .object({
            id: z.string(),
            handle: z.string(),
            email: z.string(),
            lifecycle_status: lifecycleEnum,
            decision_status: z.enum(['opted_in', 'opted_out', 'pending']),
            completeness: z.object({ complete: z.number(), total: z.number() }).strict(),
            last_action_at: z.string().nullable()
          })
          .strict()
      )
      .min(1),
    total: z.number(),
    page: z.number(),
    limit: z.number()
  })
  .strict();

/** vendor pause-gate detail */
export const pauseGateDetailSchema = z
  .object({
    vendor: z
      .object({
        id: z.string(),
        handle: z.string(),
        email: z.string(),
        lifecycle_status: lifecycleEnum,
        decision_status: z.enum(['opted_in', 'opted_out', 'pending']),
        last_action_at: z.string().nullable()
      })
      .strict(),
    checklist: z
      .array(
        z
          .object({
            key: z.enum([
              't30_sent',
              'nudges_sent',
              'decision_captured',
              'jca_signed',
              'training_verified'
            ]),
            done: z.boolean(),
            na: z.boolean()
          })
          .strict()
      )
      .min(1),
    completeness: z.object({ complete: z.number(), total: z.number() }).strict(),
    allowed_transitions: z.array(lifecycleEnum).min(1)
  })
  .strict();

/** vendor jca list */
export const jcaListSchema = z
  .object({
    id: z.string(),
    handle: z.string(),
    opted_in_date: z.string(),
    jca_status: z.enum(['not_generated', 'generated', 'signed'])
  })
  .strict();

/** vendor jca detail */
export const jcaDetailSchema = z
  .object({
    vendor_id: z.string(),
    bytes: z.number(),
    audit_log_id: z.string(),
    format: z.enum(['pdf']),
    signed_at: z.string()
  })
  .strict();

/** vendor nudges dashboard + force decision */
export const nudgesSchema = z
  .object({
    per_step_counts: z
      .object({ t21: z.number(), t14: z.number(), t7: z.number(), t3: z.number() })
      .strict(),
    decision_completion: z
      .object({
        opted_in: z.number(),
        opted_out: z.number(),
        open: z.number(),
        completion_rate: z.number()
      })
      .strict(),
    pending_decisions: z.object({ count: z.number(), days_to_flag_flip: z.number() }).strict(),
    recent_dispatches: z
      .array(
        z
          .object({
            id: z.string(),
            vendor_id: z.string(),
            vendor_handle: z.string().nullable(),
            notification_type: z.string(),
            sent_at: z.string(),
            locale: z.enum(['pl', 'en']),
            status: z.enum(['sent', 'failed'])
          })
          .strict()
      )
      .min(1)
  })
  .strict();

/** health dashboard */
export const healthDashboardSchema = z
  .object({
    updated_at: z.string(),
    services: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            ok: z.boolean(),
            latency_ms: z.number(),
            error: z.string()
          })
          .strict()
      )
      .min(1),
    entitlement_stats: z.record(z.string(), z.number()),
    last_sync_at: z.string().nullable()
  })
  .strict();

/** training cert queue */
export const trainingCertQueueSchema = z
  .object({
    id: z.string(),
    handle: z.string(),
    decision_status: z.enum(['opted_in', 'opted_out']),
    uploaded_at: z.string(),
    status: z.enum(['pending_review', 'verified', 'rejected'])
  })
  .strict();

/** training cert review */
export const trainingCertReviewSchema = z
  .object({
    vendor_id: z.string(),
    decision: z.enum(['approved', 'rejected']),
    audit_log_id: z.string()
  })
  .strict();

export type RouteContract = {
  name: string;
  routeModule: string;
  sourceFile: string;
  exportedComponent: string;
  schema: z.ZodTypeAny;
  /** Valid response sample — MUSI parsować się przez `schema`. */
  sample: unknown;
  /** Shape-drift sample — MUSI być odrzucony przez `schema` (negatywna asercja). */
  driftSample: unknown;
  /** Distinctive snake_case pola kontraktu — realne klucze schemy obecne w route source. */
  sourceAnchors: string[];
};

export const contracts: RouteContract[] = [
  {
    name: 'entitlements + voucher search',
    routeModule: '../entitlements',
    sourceFile: 'src/routes/entitlements/entitlements.tsx',
    exportedComponent: 'Component',
    schema: entitlementsSchema,
    sourceAnchors: [
      'voucher_code',
      'claim_token',
      'remaining_minor',
      'audit_log',
      'last_redeemed_at'
    ],
    sample: {
      data: {
        entitlements: [
          {
            id: 'ent_1',
            status: 'active',
            voucher_code: 'VOUCHER-1',
            claim_token: 'claim-token',
            order_id: 'order_1',
            face_value_minor: 10000,
            remaining_minor: 5000,
            currency: 'PLN',
            product_name: 'Voucher',
            vendor_name: 'Vendor',
            created_at: iso,
            expires_at: null,
            claimed_at: null,
            last_redeemed_at: iso,
            redemptions: [
              {
                id: 'red_1',
                amount_minor: 5000,
                vendor_id: 'vendor_1',
                redeemed_at: iso,
                idempotency_key: 'idem_1'
              }
            ],
            audit_log: [
              { id: 'audit_1', action: 'created', actor: 'operator', reason: null, created_at: iso }
            ]
          }
        ]
      }
    },
    // drift: face_value_minor przemianowane na face_value (rename realnego pola)
    driftSample: {
      data: {
        entitlements: [
          {
            id: 'ent_1',
            status: 'active',
            voucher_code: 'VOUCHER-1',
            claim_token: 'claim-token',
            order_id: 'order_1',
            face_value: 10000,
            remaining_minor: 5000,
            currency: 'PLN',
            product_name: 'Voucher',
            vendor_name: 'Vendor',
            created_at: iso,
            expires_at: null,
            claimed_at: null,
            last_redeemed_at: iso,
            redemptions: [
              {
                id: 'red_1',
                amount_minor: 5000,
                vendor_id: 'vendor_1',
                redeemed_at: iso,
                idempotency_key: 'idem_1'
              }
            ],
            audit_log: [
              { id: 'audit_1', action: 'created', actor: 'operator', reason: null, created_at: iso }
            ]
          }
        ]
      }
    }
  },
  {
    name: 'operator flag-flip',
    routeModule: '../operator/flag-flip',
    sourceFile: 'src/routes/operator/flag-flip/flag-flip-page.tsx',
    exportedComponent: 'Component',
    schema: flagFlipSchema,
    sourceAnchors: [
      'current_state',
      'allowed_transitions',
      'audit_trail',
      'smoke_gate_ref',
      'cache_invalidate_outcome'
    ],
    sample: {
      current_state: 'shadow',
      allowed_transitions: ['off', 'on'],
      last_transitioned_at: iso,
      last_admin: 'admin_1',
      audit_trail: [
        {
          audit_log_id: 'audit_1',
          from: 'off',
          to: 'shadow',
          triggered_by: 'admin_1',
          admin_note: 'note',
          smoke_gate_ref: 'gate_1',
          cache_invalidate_outcome: { errors: ['redis_timeout'], duration_ms: 20 },
          at: iso
        }
      ]
    },
    // drift: current_state poza enum (zmieniona domena wartości)
    driftSample: {
      current_state: 'enabled',
      allowed_transitions: ['off', 'on'],
      last_transitioned_at: iso,
      last_admin: 'admin_1',
      audit_trail: [
        {
          audit_log_id: 'audit_1',
          from: 'off',
          to: 'shadow',
          triggered_by: 'admin_1',
          admin_note: 'note',
          smoke_gate_ref: 'gate_1',
          cache_invalidate_outcome: { errors: ['redis_timeout'], duration_ms: 20 },
          at: iso
        }
      ]
    }
  },
  {
    name: 'operator security-gates',
    routeModule: '../operator/security-gates',
    sourceFile: 'src/routes/operator/security-gates/security-gates-page.tsx',
    exportedComponent: 'Component',
    schema: securityGatesSchema,
    sourceAnchors: ['last_verified_at', 'last_run_by', 'requested_gate'],
    sample: {
      gates: [{ gate: 'csrf', status: 'pass', detail: 'ok', last_verified_at: iso }],
      overall: 'pass',
      verified_at: iso,
      last_run_by: 'admin_1',
      history: [
        { requested_gate: 'all', overall: 'pass', verified_at: iso, last_run_by: 'admin_1' }
      ]
    },
    // drift: status mistyped (number zamiast enum-string)
    driftSample: {
      gates: [{ gate: 'csrf', status: 1, detail: 'ok', last_verified_at: iso }],
      overall: 'pass',
      verified_at: iso,
      last_run_by: 'admin_1',
      history: [
        { requested_gate: 'all', overall: 'pass', verified_at: iso, last_run_by: 'admin_1' }
      ]
    }
  },
  {
    name: 'operator smoke-gate',
    routeModule: '../operator/smoke-gate',
    sourceFile: 'src/routes/operator/smoke-gate/smoke-gate-page.tsx',
    exportedComponent: 'Component',
    schema: smokeGateSchema,
    sourceAnchors: ['nfr_ref', 'evidence_url', 'last_ratified', 'computed_at'],
    sample: {
      items: [
        {
          key: 'phase_b_smoke',
          label: 'Phase B',
          nfr_ref: 'FR-C6',
          status: 'pass',
          evidence_url: 'https://evidence.example/run',
          source: 'ci'
        }
      ],
      computed: 'pass',
      last_ratified: { verdict: 'pass', admin_id: 'admin_1', admin_note: 'ok', ratified_at: iso },
      computed_at: iso
    },
    // drift: brak pola computed_at (missing field)
    driftSample: {
      items: [
        {
          key: 'phase_b_smoke',
          label: 'Phase B',
          nfr_ref: 'FR-C6',
          status: 'pass',
          evidence_url: 'https://evidence.example/run',
          source: 'ci'
        }
      ],
      computed: 'pass',
      last_ratified: { verdict: 'pass', admin_id: 'admin_1', admin_note: 'ok', ratified_at: iso }
    }
  },
  {
    name: 'vendor decisions list',
    routeModule: '../vendors/decisions',
    sourceFile: 'src/routes/vendors/decisions/decisions-list.tsx',
    exportedComponent: 'Component',
    schema: decisionsListSchema,
    sourceAnchors: ['decision_status', 'lifecycle_status', 'last_action_at'],
    sample: {
      vendors: [
        {
          id: 'vendor_1',
          handle: 'vendor',
          email: 'vendor@example.com',
          lifecycle_status: 'pending_approval',
          decision_status: 'pending',
          last_action_at: null
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    },
    // drift: decision_status poza enum
    driftSample: {
      vendors: [
        {
          id: 'vendor_1',
          handle: 'vendor',
          email: 'vendor@example.com',
          lifecycle_status: 'pending_approval',
          decision_status: 'unknown',
          last_action_at: null
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    }
  },
  {
    name: 'vendor decision capture',
    routeModule: '../vendors/decisions/[id]',
    sourceFile: 'src/routes/vendors/decisions/decision-detail.tsx',
    exportedComponent: 'Component',
    schema: decisionCaptureSchema,
    sourceAnchors: ['vendor_id', 'audit_log_id', 'email_dispatched'],
    sample: {
      vendor_id: 'vendor_1',
      decision: 'opted_in',
      audit_log_id: 'audit_1',
      email_dispatched: true
    },
    // drift: audit_log_id mistyped (number)
    driftSample: {
      vendor_id: 'vendor_1',
      decision: 'opted_in',
      audit_log_id: 42,
      email_dispatched: true
    }
  },
  {
    name: 'vendor pause-gate list',
    routeModule: '../vendors/pause-gate',
    sourceFile: 'src/routes/vendors/pause-gate/pause-gate-list.tsx',
    exportedComponent: 'Component',
    schema: pauseGateListSchema,
    sourceAnchors: ['decision_status', 'lifecycle_status', 'completeness', 'last_action_at'],
    sample: {
      vendors: [
        {
          id: 'vendor_1',
          handle: 'vendor',
          email: 'vendor@example.com',
          lifecycle_status: 'pending_approval',
          decision_status: 'opted_in',
          completeness: { complete: 4, total: 5 },
          last_action_at: iso
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    },
    // drift: completeness.total przemianowane na count
    driftSample: {
      vendors: [
        {
          id: 'vendor_1',
          handle: 'vendor',
          email: 'vendor@example.com',
          lifecycle_status: 'pending_approval',
          decision_status: 'opted_in',
          completeness: { complete: 4, count: 5 },
          last_action_at: iso
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    }
  },
  {
    name: 'vendor pause-gate detail',
    routeModule: '../vendors/pause-gate/[id]',
    sourceFile: 'src/routes/vendors/pause-gate/pause-gate-detail.tsx',
    exportedComponent: 'Component',
    schema: pauseGateDetailSchema,
    sourceAnchors: ['allowed_transitions', 'completeness', 'checklist'],
    sample: {
      vendor: {
        id: 'vendor_1',
        handle: 'vendor',
        email: 'vendor@example.com',
        lifecycle_status: 'pending_approval',
        decision_status: 'opted_in',
        last_action_at: iso
      },
      checklist: [{ key: 'training_verified', done: true, na: false }],
      completeness: { complete: 4, total: 5 },
      allowed_transitions: ['open', 'suspended']
    },
    // drift: checklist[].key poza enum
    driftSample: {
      vendor: {
        id: 'vendor_1',
        handle: 'vendor',
        email: 'vendor@example.com',
        lifecycle_status: 'pending_approval',
        decision_status: 'opted_in',
        last_action_at: iso
      },
      checklist: [{ key: 'unknown_step', done: true, na: false }],
      completeness: { complete: 4, total: 5 },
      allowed_transitions: ['open', 'suspended']
    }
  },
  {
    name: 'vendor jca list',
    routeModule: '../vendors/jca',
    sourceFile: 'src/routes/vendors/jca/jca-list.tsx',
    exportedComponent: 'Component',
    schema: jcaListSchema,
    sourceAnchors: ['jca_status', 'opted_in_date'],
    sample: {
      id: 'vendor_1',
      handle: 'vendor',
      opted_in_date: '2026-06-12',
      jca_status: 'generated'
    },
    // drift: jca_status poza enum
    driftSample: {
      id: 'vendor_1',
      handle: 'vendor',
      opted_in_date: '2026-06-12',
      jca_status: 'pending'
    }
  },
  {
    name: 'vendor jca detail',
    routeModule: '../vendors/jca/[id]',
    sourceFile: 'src/routes/vendors/jca/jca-detail.tsx',
    exportedComponent: 'Component',
    schema: jcaDetailSchema,
    sourceAnchors: ['vendor_id', 'audit_log_id', 'signed_at'],
    sample: {
      vendor_id: 'vendor_1',
      bytes: 12345,
      audit_log_id: 'audit_1',
      format: 'pdf',
      signed_at: iso
    },
    // drift: bytes mistyped (string)
    driftSample: {
      vendor_id: 'vendor_1',
      bytes: '12345',
      audit_log_id: 'audit_1',
      format: 'pdf',
      signed_at: iso
    }
  },
  {
    name: 'vendor nudges dashboard + force decision',
    routeModule: '../vendors/notifications/nudges',
    sourceFile: 'src/routes/vendors/notifications/nudges/nudges-dashboard.tsx',
    exportedComponent: 'Component',
    schema: nudgesSchema,
    sourceAnchors: [
      'per_step_counts',
      'decision_completion',
      'pending_decisions',
      'recent_dispatches',
      'days_to_flag_flip'
    ],
    sample: {
      per_step_counts: { t21: 1, t14: 2, t7: 3, t3: 4 },
      decision_completion: { opted_in: 10, opted_out: 2, open: 3, completion_rate: 0.8 },
      pending_decisions: { count: 3, days_to_flag_flip: 10 },
      recent_dispatches: [
        {
          id: 'dispatch_1',
          vendor_id: 'vendor_1',
          vendor_handle: null,
          notification_type: 't21',
          sent_at: iso,
          locale: 'pl',
          status: 'sent'
        }
      ]
    },
    // drift: nadmiarowe pole (strict odrzuca) — extra `unexpected` w pending_decisions
    driftSample: {
      per_step_counts: { t21: 1, t14: 2, t7: 3, t3: 4 },
      decision_completion: { opted_in: 10, opted_out: 2, open: 3, completion_rate: 0.8 },
      pending_decisions: { count: 3, days_to_flag_flip: 10, unexpected: true },
      recent_dispatches: [
        {
          id: 'dispatch_1',
          vendor_id: 'vendor_1',
          vendor_handle: null,
          notification_type: 't21',
          sent_at: iso,
          locale: 'pl',
          status: 'sent'
        }
      ]
    }
  },
  {
    name: 'health dashboard',
    routeModule: '../health-dashboard',
    sourceFile: 'src/routes/health-dashboard/health-dashboard.tsx',
    exportedComponent: 'Component',
    schema: healthDashboardSchema,
    sourceAnchors: ['latency_ms', 'entitlement_stats', 'last_sync_at'],
    sample: {
      updated_at: iso,
      services: [{ id: 'postgres', name: 'Postgres', ok: true, latency_ms: 5, error: 'none' }],
      entitlement_stats: { active: 10 },
      last_sync_at: null
    },
    // drift: entitlement_stats wartość mistyped (string zamiast number w record)
    driftSample: {
      updated_at: iso,
      services: [{ id: 'postgres', name: 'Postgres', ok: true, latency_ms: 5, error: 'none' }],
      entitlement_stats: { active: '10' },
      last_sync_at: null
    }
  },
  {
    name: 'training cert queue',
    routeModule: '../vendors/training-certs',
    sourceFile: 'src/routes/vendors/training-certs/training-cert-queue.tsx',
    exportedComponent: 'Component',
    schema: trainingCertQueueSchema,
    sourceAnchors: ['decision_status', 'uploaded_at'],
    sample: {
      id: 'cert_1',
      handle: 'vendor',
      decision_status: 'opted_in',
      uploaded_at: iso,
      status: 'pending_review'
    },
    // drift: status poza enum
    driftSample: {
      id: 'cert_1',
      handle: 'vendor',
      decision_status: 'opted_in',
      uploaded_at: iso,
      status: 'in_review'
    }
  },
  {
    name: 'training cert review',
    routeModule: '../vendors/training-certs/[id]',
    sourceFile: 'src/routes/vendors/training-certs/training-cert-detail.tsx',
    exportedComponent: 'Component',
    schema: trainingCertReviewSchema,
    sourceAnchors: ['vendor_id', 'audit_log_id'],
    sample: { vendor_id: 'vendor_1', decision: 'approved', audit_log_id: 'audit_1' },
    // drift: decision poza enum
    driftSample: { vendor_id: 'vendor_1', decision: 'pending', audit_log_id: 'audit_1' }
  }
];
