/**
 * Story v160-7-3: Vendor decision detail page (admin-panel).
 *
 * Per-vendor capture form: radio (opt_in | opt_out) + reason textarea +
 * admin_note textarea + confirmation modal + submit → POST /admin/vendors/[id]/decision.
 *
 * Per Sprint 4 Wave 15 batch — FR34 canonical capture surface (vs Story 7.2 quick force-decision).
 */

import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  Button,
  Container,
  Heading,
  RadioGroup,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/client"

type DecisionType = "opted_in" | "opted_out"

type CaptureResponse = {
  vendor_id: string
  decision: DecisionType
  audit_log_id: string
  email_dispatched: boolean
}

export function VendorDecisionDetailPage(): React.JSX.Element {
  const params = useParams()
  const vendorId = params.id ?? ""
  const qc = useQueryClient()

  const [decision, setDecision] = useState<DecisionType | "">("")
  const [reason, setReason] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const captureMutation = useMutation({
    mutationFn: (): Promise<CaptureResponse> =>
      sdk.client.fetch(`/admin/vendors/${vendorId}/decision`, {
        method: "POST",
        body: { decision, reason, admin_note: adminNote || undefined },
      }),
    onSuccess: (data) => {
      if (data.email_dispatched) {
        toast.success(
          `Decision captured: ${data.decision} (audit ${data.audit_log_id})`,
        )
      } else {
        toast.warning(
          `Decision captured: ${data.decision} (audit ${data.audit_log_id}). Confirmation email delivery is not enabled in this environment.`,
        )
      }
      void qc.invalidateQueries({ queryKey: ["admin-vendors-decisions"] })
      setConfirmOpen(false)
      window.location.href = "/app/vendors/decisions"
    },
    onError: (err) => {
      toast.error(`Capture failed: ${(err as Error).message}`)
      setConfirmOpen(false)
    },
  })

  const reasonValid = reason.trim().length >= 10
  const decisionValid = decision === "opted_in" || decision === "opted_out"
  const canSubmit = reasonValid && decisionValid && !captureMutation.isPending

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Capture Vendor Decision</Heading>
        <Text className="text-ui-fg-subtle">Vendor ID: {vendorId}</Text>
      </div>

      <div className="space-y-6 rounded-md border border-ui-border-base p-6">
        <div>
          <Text weight="plus">Decision</Text>
          <RadioGroup
            value={decision}
            onValueChange={(v) => setDecision(v as DecisionType)}
            className="mt-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroup.Item value="opted_in" id="opt-in" />
              <label htmlFor="opt-in">Opt-in (vendor migrates to multi-vendor)</label>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <RadioGroup.Item value="opted_out" id="opt-out" />
              <label htmlFor="opt-out">Opt-out (vendor declines migration)</label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Text weight="plus">Reason (required, min 10 chars)</Text>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vendor's stated reason for this decision"
            className="mt-1"
            rows={4}
          />
          {reason.length > 0 && !reasonValid && (
            <Text size="small" className="text-ui-fg-error">
              Reason must be at least 10 characters.
            </Text>
          )}
        </div>

        <div>
          <Text weight="plus">Admin note (optional, private)</Text>
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Operational note (NOT sent to vendor)"
            className="mt-1"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-ui-border-base pt-4">
          <Button
            variant="primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit}
          >
            Submit decision
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ui-bg-overlay">
          <div className="max-w-md rounded-md bg-ui-bg-base p-6 shadow-elevation-modal">
            <Heading level="h2" className="mb-2">
              Confirm decision
            </Heading>
            <Text className="text-ui-fg-subtle">
              Decision: <strong>{decision}</strong>
            </Text>
            <Text className="mt-1 text-ui-fg-subtle">
              Reason: {reason}
            </Text>
            {adminNote && (
              <Text className="mt-1 text-ui-fg-subtle">
                Admin note: {adminNote}
              </Text>
            )}
            <Text className="mt-3 text-ui-fg-error">
              This action persists the vendor decision immediately.
              Confirmation email is sent only when backend delivery wiring is
              enabled.
            </Text>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={captureMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => captureMutation.mutate()}
                disabled={captureMutation.isPending}
              >
                {captureMutation.isPending ? "Submitting…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
