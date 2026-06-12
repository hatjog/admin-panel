/**
 * Story v160-7-4: Pause gate detail page — per-vendor approval workflow.
 *
 * Renders 5-item checklist + ADR-088 reassess context panel + transition CTAs.
 */

import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type LifecycleStatus = "pending_approval" | "open" | "suspended" | "terminated"

type TransitionResponse = {
  vendor_id: string
  from_status: LifecycleStatus
  to_status: LifecycleStatus
  audit_log_id: string
}

type ChecklistItem = {
  key:
    | "t30_sent"
    | "nudges_sent"
    | "decision_captured"
    | "jca_signed"
    | "training_verified"
  done: boolean
  na: boolean
}

type PauseGateDetailResponse = {
  vendor: {
    id: string
    handle: string
    email: string
    lifecycle_status: LifecycleStatus
    decision_status: "opted_in" | "opted_out" | "pending"
    last_action_at: string | null
  }
  checklist: ChecklistItem[]
  completeness: { complete: number; total: number }
  allowed_transitions: LifecycleStatus[]
}

const CHECKLIST_LABELS: Record<ChecklistItem["key"], string> = {
  t30_sent: "T-30 notification sent",
  nudges_sent: "Nudge cadence completed",
  decision_captured: "Decision captured",
  jca_signed: "JCA signed",
  training_verified: "Training cert verified",
}

export function VendorPauseGateDetailPage(): React.JSX.Element {
  const params = useParams()
  const vendorId = params.id ?? ""

  const [adminNote, setAdminNote] = useState("")
  const [adrExpanded, setAdrExpanded] = useState(false)
  const [pendingTo, setPendingTo] = useState<LifecycleStatus | null>(null)

  const { data, isLoading } = useQuery<PauseGateDetailResponse>({
    queryKey: ["admin-vendors-pause-gate-detail", vendorId],
    queryFn: () => mercurAdminClient.vendors.pauseGate.retrieve<PauseGateDetailResponse>(vendorId),
    enabled: vendorId.length > 0,
    staleTime: 30_000,
  })

  const checklist = data?.checklist ?? []
  const completeCount = data?.completeness.complete ?? 0
  const checklistTotal = data?.completeness.total ?? checklist.length
  const allowedTransitions = new Set(data?.allowed_transitions ?? [])
  const vendor = data?.vendor

  const transitionMutation = useMutation({
    mutationFn: (to: LifecycleStatus): Promise<TransitionResponse> =>
      mercurAdminClient.vendors.lifecycle.transition<TransitionResponse>(vendorId, {
          to_status: to,
          admin_note: adminNote || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`Transitioned: ${data.from_status} → ${data.to_status}`)
      setPendingTo(null)
      window.location.href = "/app/vendors/pause-gate"
    },
    onError: (err) => {
      toast.error(`Transition failed: ${(err as Error).message}`)
      setPendingTo(null)
    },
  })

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Pause Gate Review</Heading>
        <Text className="text-ui-fg-subtle">
          {vendor ? `${vendor.handle} · ${vendor.email}` : `Vendor ID: ${vendorId}`}
        </Text>
        {vendor && (
          <div className="mt-2 flex items-center gap-2">
            <Badge color={vendor.lifecycle_status === "open" ? "green" : vendor.lifecycle_status === "suspended" ? "orange" : vendor.lifecycle_status === "terminated" ? "red" : "blue"}>
              {vendor.lifecycle_status}
            </Badge>
            <Text className="text-ui-fg-subtle">Decision: {vendor.decision_status}</Text>
          </div>
        )}
      </div>

      {isLoading && <Text>Loading…</Text>}

      {!isLoading && !vendor && (
        <div className="rounded-md border border-dashed border-ui-border-base p-8 text-center">
          <Text className="text-ui-fg-subtle">Vendor pause-gate detail is unavailable.</Text>
        </div>
      )}

      {vendor && (
        <div className="space-y-6">
        <section className="rounded-md border border-ui-border-base p-6">
          <Heading level="h2" className="mb-3">
            Completeness checklist
            <span className="ml-2 font-mono text-base">
              ({completeCount}/{checklistTotal})
            </span>
          </Heading>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span className="font-mono">
                  {item.na ? "⊘" : item.done ? "✓" : "✗"}
                </span>
                <span>{CHECKLIST_LABELS[item.key]}</span>
                {item.na && <Badge color="grey">N/A</Badge>}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-ui-border-base p-6">
          <div className="flex items-center justify-between">
            <Heading level="h2">
              ADR-088 Reassess Context
            </Heading>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setAdrExpanded((v) => !v)}
            >
              {adrExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
          {adrExpanded && (
            <div className="mt-3 space-y-2 text-sm text-ui-fg-subtle">
              <Text>
                <strong>Mercur 2 Vendor Lifecycle Modeling</strong> — see
                specs/adr/ADR-088-reassess.md (placeholder; reassess content
                pending authoring).
              </Text>
              <Text>
                Canonical schema preserves Mercur 2 vendor table; lifecycle
                fields written to vendor.metadata JSON. State machine forward-only
                in v1.6.0; reversal requires manual intervention.
              </Text>
            </div>
          )}
        </section>

        <section className="rounded-md border border-ui-border-base p-6">
          <Heading level="h2" className="mb-3">
            Transition
          </Heading>

          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Admin note (private, included in audit log)"
            rows={3}
            className="mb-4"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => setPendingTo("open")}
              disabled={
                completeCount < 4 ||
                transitionMutation.isPending ||
                !allowedTransitions.has("open")
              }
            >
              Approve → open
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPendingTo("suspended")}
              disabled={
                transitionMutation.isPending ||
                !allowedTransitions.has("suspended")
              }
            >
              Suspend → suspended
            </Button>
            <Button
              variant="danger"
              onClick={() => setPendingTo("terminated")}
              disabled={
                transitionMutation.isPending ||
                !allowedTransitions.has("terminated")
              }
            >
              Terminate → terminated
            </Button>
          </div>

          {completeCount < 4 && (
            <Text size="small" className="mt-2 text-ui-fg-subtle">
              Approve disabled — completeness {completeCount}/{checklistTotal} (≥4 required)
            </Text>
          )}
        </section>
      </div>
      )}

      {vendor && pendingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ui-bg-overlay">
          <div className="max-w-md rounded-md bg-ui-bg-base p-6 shadow-elevation-modal">
            <Heading level="h2" className="mb-2">
              Confirm: → {pendingTo}
            </Heading>
            <Text className="text-ui-fg-subtle">
              This action is recorded in the audit log.
              {pendingTo === "terminated" &&
                " Terminated is a TERMINAL state — reversal requires manual intervention."}
            </Text>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPendingTo(null)}
                disabled={transitionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => transitionMutation.mutate(pendingTo)}
                disabled={transitionMutation.isPending}
              >
                {transitionMutation.isPending ? "…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
