/**
 * Story v160-8-3: Tri-state flag flip operator page.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/client"

type FlagState = "off" | "shadow" | "on"

type FlagStatus = {
  current_state: FlagState
  allowed_transitions: FlagState[]
  last_transitioned_at: string | null
  last_admin: string | null
  audit_trail: Array<{
    audit_log_id: string
    from: FlagState
    to: FlagState
    triggered_by: string
    admin_note?: string
    smoke_gate_ref?: string
    cache_invalidate_outcome?: { errors?: string[]; duration_ms?: number }
    at: string
  }>
}

type SmokeGateStatus = {
  computed: "pass" | "fail" | "pending"
  last_ratified?: { verdict: "pass" | "fail" } | null
}

function badgeColor(s: FlagState): "red" | "orange" | "green" {
  return s === "off" ? "red" : s === "shadow" ? "orange" : "green"
}

export function FlagFlipPage(): React.JSX.Element {
  const qc = useQueryClient()
  const [target, setTarget] = useState<FlagState | null>(null)
  const [adminNote, setAdminNote] = useState("")

  const { data: status } = useQuery<FlagStatus>({
    queryKey: ["admin-operator-flag-flip"],
    queryFn: () => sdk.client.fetch("/admin/operator/flag-flip"),
  })
  const { data: gate } = useQuery<SmokeGateStatus>({
    queryKey: ["admin-operator-smoke-gate-status"],
    queryFn: () => sdk.client.fetch("/admin/operator/smoke-gate-status"),
  })

  const transition = useMutation({
    mutationFn: (to: FlagState) =>
      sdk.client.fetch("/admin/operator/flag-flip", {
        method: "POST",
        body: { to_state: to, admin_note: adminNote },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operator-flag-flip"] })
      setTarget(null)
      setAdminNote("")
    },
  })

  const ratifiedPass = gate?.last_ratified?.verdict === "pass"

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Multi-vendor Flag Flip</Heading>
        <Text className="text-ui-fg-subtle">
          Tri-state OFF/SHADOW/ON; transitions gated by Phase B SMOKE GATE.
        </Text>
      </div>

      {!ratifiedPass && (
        <div className="mb-4 rounded-md border border-ui-border-error bg-ui-bg-error p-3">
          <Text>
            Phase B SMOKE GATE not ratified PASS — transitions to SHADOW/ON
            blocked. Visit /operator/smoke-gate to ratify.
          </Text>
        </div>
      )}

      {status && (
        <>
          <div className="mb-6 rounded-md border border-ui-border-base p-4">
            <Badge color={badgeColor(status.current_state)}>
              {status.current_state.toUpperCase()}
            </Badge>
            <Text className="ml-3 inline">
              Last transition:{" "}
              {status.last_transitioned_at
                ? new Date(status.last_transitioned_at).toLocaleString()
                : "—"}{" "}
              by {status.last_admin ?? "—"}
            </Text>
          </div>

          <div className="mb-4 flex gap-2">
            {(["off", "shadow", "on"] as FlagState[]).map((s) => (
              <Button
                key={s}
                disabled={!status.allowed_transitions.includes(s)}
                variant={status.current_state === s ? "secondary" : "primary"}
                onClick={() => setTarget(s)}
              >
                Transition → {s.toUpperCase()}
              </Button>
            ))}
          </div>

          {target && (
            <div className="mb-4 rounded-md border border-ui-border-base p-4">
              <Text>
                Confirm transition {status.current_state} → {target}.
                Will invalidate ISR tags + Redis ns mv:flag:* + storefront SDK
                cache.
              </Text>
              <Input
                className="mt-2"
                placeholder="Admin note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => transition.mutate(target)}
                  disabled={transition.isPending}
                >
                  Confirm
                </Button>
                <Button variant="secondary" onClick={() => setTarget(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Heading level="h3" className="mb-2">
            Audit trail
          </Heading>
          <div className="overflow-x-auto rounded-md border border-ui-border-base">
            <table className="min-w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">From → To</th>
                  <th className="px-3 py-2 text-left">By</th>
                  <th className="px-3 py-2 text-left">Note</th>
                  <th className="px-3 py-2 text-left">Cache</th>
                </tr>
              </thead>
              <tbody>
                {status.audit_trail.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-ui-fg-subtle" colSpan={5}>
                      No transitions recorded.
                    </td>
                  </tr>
                )}
                {status.audit_trail.map((e) => (
                  <tr key={e.audit_log_id} className="border-t border-ui-border-base">
                    <td className="px-3 py-2">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {e.from} → {e.to}
                    </td>
                    <td className="px-3 py-2">{e.triggered_by}</td>
                    <td className="px-3 py-2">{e.admin_note ?? "—"}</td>
                    <td className="px-3 py-2">
                      {e.cache_invalidate_outcome?.errors?.length
                        ? `errors: ${e.cache_invalidate_outcome.errors.length}`
                        : "ok"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Container>
  )
}
