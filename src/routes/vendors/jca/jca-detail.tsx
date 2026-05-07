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
import { sdk } from "@lib/client"

type GenerateResponse = {
  vendor_id: string
  pdf_path: string
  bytes: number
  audit_log_id: string
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
      sdk.client.fetch(`/admin/vendors/${vendorId}/jca/generate`, {
        method: "POST",
        body: { locale: "pl" },
      }),
    onSuccess: (data) => {
      setGenerated(data)
      toast.success(`JCA generated — ${data.bytes} bytes`)
    },
    onError: (err) => toast.error(`Generation failed: ${(err as Error).message}`),
  })

  const signMutation = useMutation({
    mutationFn: (): Promise<SignResponse> =>
      sdk.client.fetch(`/admin/vendors/${vendorId}/jca/sign`, {
        method: "POST",
        body: { admin_note: adminNote || undefined },
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
              Path: <code>{generated.pdf_path}</code> · Audit:{" "}
              <code>{generated.audit_log_id}</code> · Size: {generated.bytes} bytes
            </Text>
          )}
          {generated && (
            <div className="mt-3">
              <a
                href={`/api/admin/vendors/${vendorId}/jca/download`}
                download={`jca-${vendorId}.pdf`}
                className="text-ui-fg-interactive underline text-sm"
                aria-label="Download JCA PDF"
              >
                Download JCA PDF (.pdf)
              </a>
            </div>
          )}
          {/* TF-151 resolved (cleanup-41): PDF rendering is now real (pdfkit).
              Legacy note about text-Buffer deferred has been removed. */}
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
