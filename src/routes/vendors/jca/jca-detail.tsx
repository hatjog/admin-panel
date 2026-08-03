/**
 * Story v160-7-5: JCA detail page — generate + preview + mark-signed.
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
import { useMutation } from "@tanstack/react-query"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type GenerateResponse = {
  vendor_id: string
  bytes: number
  audit_log_id: string
  /** Backend cleanup-41: format flag — "pdf" for v1.6.0+ */
  format?: "pdf"
}

type SignResponse = {
  vendor_id: string
  signed_at: string
  audit_log_id: string
}

export function VendorJCADetailPage(): React.JSX.Element {
  const params = useParams()
  const vendorId = params.id ?? ""

  const [generated, setGenerated] = useState<GenerateResponse | null>(null)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState("")

  const generateMutation = useMutation({
    mutationFn: (): Promise<GenerateResponse> =>
      mercurAdminClient.vendors.jca.generate<GenerateResponse>(vendorId, { locale: "pl" }),
    onSuccess: (data) => {
      setGenerated(data)
      toast.success(`JCA generated — ${data.bytes} bytes`)
    },
    onError: (err) => toast.error(`Generation failed: ${(err as Error).message}`),
  })

  /**
   * Download mutation: POSTs to /jca/generate?download=1 which streams the
   * PDF binary (Content-Type: application/pdf, Content-Disposition: attachment).
   * Reads response as Blob, builds an Object URL, and triggers a click on a
   * synthetic <a download> to force a save dialog with the .pdf filename.
   *
   * Implements review fix A-1 — the original `<a href=…/jca/download>` pointed
   * to a non-existent route. Cross-origin safe (uses SDK auth headers).
   */
  const downloadMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const blob = await mercurAdminClient.vendors.jca.download(vendorId, { locale: "pl" })
      if (!(blob instanceof Blob)) {
        throw new Error("Download response was not a Blob")
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jca-${vendorId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Defer URL revoke until click handler completes.
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    },
    onError: (err) =>
      toast.error(`Download failed: ${(err as Error).message}`),
  })

  const downloadPdf = (): void => {
    downloadMutation.mutate()
  }

  const signMutation = useMutation({
    mutationFn: (): Promise<SignResponse> =>
      mercurAdminClient.vendors.jca.sign<SignResponse>(vendorId, {
        admin_note: adminNote || undefined,
      }),
    onSuccess: (data) => {
      setSignedAt(data.signed_at)
      toast.success(`JCA marked as signed at ${data.signed_at}`)
    },
    onError: (err) => toast.error(`Sign failed: ${(err as Error).message}`),
  })

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Manage JCA</Heading>
        <Text className="text-ui-fg-subtle">Vendor ID: {vendorId}</Text>
      </div>

      <div className="space-y-6">
        <section className="rounded-md border border-ui-border-base p-6">
          <Heading level="h2" className="mb-3">
            Generation
          </Heading>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "…" : "Generate JCA PDF"}
            </Button>
            {generated && (
              <Badge color="green">Generated — {generated.bytes} bytes</Badge>
            )}
          </div>
          {generated && (
            <Text size="small" className="mt-2 text-ui-fg-subtle">
              Audit: <code>{generated.audit_log_id}</code> · Size:{" "}
              {generated.bytes} bytes · Format: {generated.format ?? "pdf"}
            </Text>
          )}
          {generated && (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => downloadPdf()}
                disabled={downloadMutation.isPending}
                aria-label="Download JCA PDF"
              >
                {downloadMutation.isPending
                  ? "…"
                  : "Download JCA PDF (.pdf)"}
              </Button>
            </div>
          )}
          {/* TF-151 resolved (cleanup-41 + review): PDF rendering is real (pdfkit).
              Download is a POST against /jca/generate?download=1 — Blob URL on the
              client. Original `<a href=…/jca/download>` pointed to non-existent
              route (review finding A-1). */}
        </section>

        <section className="rounded-md border border-ui-border-base p-6">
          <Heading level="h2" className="mb-3">
            Mark as signed
          </Heading>
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Admin note (optional)"
            rows={2}
            className="mb-3"
          />
          <Button
            variant="primary"
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending || !generated}
          >
            {signMutation.isPending ? "…" : "Mark as signed"}
          </Button>
          {signedAt && (
            <Badge color="green" className="ml-3">
              Signed at {signedAt}
            </Badge>
          )}
          {!generated && (
            <Text size="small" className="mt-2 text-ui-fg-subtle">
              Generate JCA first before marking as signed.
            </Text>
          )}
        </section>

        <section className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-6">
          <Heading level="h2" className="mb-2">
            E-signature integration (coming soon)
          </Heading>
          <Text className="text-ui-fg-subtle">
            HelloSign / DocuSign integration coming v1.7.0+. For v1.6.0,
            vendors sign out-of-band and admin marks signed via the workflow above.
          </Text>
          <Button variant="secondary" disabled className="mt-3">
            Send for e-signature (v1.7.0+)
          </Button>
        </section>
      </div>
    </Container>
  )
}
