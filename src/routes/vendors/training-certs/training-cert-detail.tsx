/**
 * Story v160-7-6: Admin training cert detail (approve / reject) page.
 */

import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  Button,
  Container,
  Heading,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type ReviewResponse = {
  vendor_id: string
  decision: "approved" | "rejected"
  audit_log_id: string
}

export function VendorTrainingCertDetailPage(): React.JSX.Element {
  const params = useParams()
  const vendorId = params.id ?? ""

  const [adminNote, setAdminNote] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [mode, setMode] = useState<"approve" | "reject" | null>(null)

  const reviewMutation = useMutation({
    mutationFn: (decision: "approve" | "reject"): Promise<ReviewResponse> =>
      mercurAdminClient.vendors.trainingCert.review<ReviewResponse>(vendorId, {
          decision,
          admin_note: adminNote || undefined,
          rejection_reason:
            decision === "reject" ? rejectionReason : undefined,
      }),
    onSuccess: (data) => {
      toast.success(`Cert ${data.decision}`)
      setMode(null)
      window.location.href = "/app/vendors/training-certs"
    },
    onError: (err) => {
      toast.error(`Action failed: ${(err as Error).message}`)
      setMode(null)
    },
  })

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Training Cert Review</Heading>
        <Text className="text-ui-fg-subtle">Vendor ID: {vendorId}</Text>
      </div>

      <div className="space-y-6">
        <section className="rounded-md border border-ui-border-base p-6">
          <Heading level="h2" className="mb-3">
            Certificate preview
          </Heading>
          <Text className="text-ui-fg-subtle">
            Preview surface — production renders PDF iframe or img tag from
            GET /admin/vendors/[id]/training-cert/preview. Wave 15 scaffolding
            shows placeholder.
          </Text>
          <div className="mt-3 rounded border border-dashed border-ui-border-base p-12 text-center text-ui-fg-subtle">
            [PDF / image preview]
          </div>
        </section>

        <section className="rounded-md border border-ui-border-base p-6">
          <Heading level="h2" className="mb-3">
            Decision
          </Heading>

          {mode === null && (
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setMode("approve")}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => setMode("reject")}>
                Reject
              </Button>
            </div>
          )}

          {mode === "approve" && (
            <div className="space-y-3">
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin note (optional)"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => reviewMutation.mutate("approve")}
                  disabled={reviewMutation.isPending}
                >
                  Confirm approve
                </Button>
                <Button variant="secondary" onClick={() => setMode(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-3">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection reason (required, min 20 chars)"
                rows={4}
              />
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin note (optional, private)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => reviewMutation.mutate("reject")}
                  disabled={
                    reviewMutation.isPending ||
                    rejectionReason.trim().length < 20
                  }
                >
                  Confirm reject
                </Button>
                <Button variant="secondary" onClick={() => setMode(null)}>
                  Cancel
                </Button>
              </div>
              {rejectionReason.length > 0 &&
                rejectionReason.trim().length < 20 && (
                  <Text size="small" className="text-ui-fg-error">
                    Rejection reason must be at least 20 characters.
                  </Text>
                )}
            </div>
          )}
        </section>
      </div>
    </Container>
  )
}
