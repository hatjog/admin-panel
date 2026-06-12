/**
 * Story v160-7-1: T-30 notification window admin page.
 *
 * Admin-triggered email notification window — sends migration notice to all
 * `open` lifecycle vendors 30 days before flag flip (FR32 + FR33 + FR44).
 *
 * Per Sprint 4 Wave 13 batch: this is the FIRST persona-facing transition
 * step in the pre-flag-flip Epic 7 sequence (T-30 → opt-in/opt-out → JCA →
 * settlement). Audit log entry per dispatch satisfies FR44 traceability.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type EligibleVendor = {
  id: string
  handle: string
  email: string
  lifecycle_status: string
  locale: "pl" | "en"
  last_notified_at: string | null
}

type PreviewResponse = {
  window_opens: string
  flag_flip_date: string
  eligible_count: number
  vendors: EligibleVendor[]
}

type AuditLogEntry = {
  id: string
  vendor_id: string
  vendor_handle: string | null
  notification_type: "t30_migration"
  sent_at: string
  locale: "pl" | "en"
  recipient_email: string
  status: "sent" | "failed"
  error_message: string | null
  triggered_by: string
}

type AuditLogResponse = {
  entries: AuditLogEntry[]
}

type TriggerResponse = {
  triggered: number
  skipped: number
  failed: number
  audit_log_ids: string[]
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toISOString().slice(0, 10)
}

export function T30NotificationPage() {
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: preview, isLoading: previewLoading } = useQuery<PreviewResponse>({
    queryKey: ["admin-vendors-t30-preview"],
    queryFn: () => mercurAdminClient.vendors.notifications.t30.preview<PreviewResponse>(),
    staleTime: 30_000,
  })

  const { data: log } = useQuery<AuditLogResponse>({
    queryKey: ["admin-vendors-t30-audit"],
    queryFn: () => mercurAdminClient.vendors.notifications.t30.audit<AuditLogResponse>(),
    staleTime: 30_000,
  })

  const dryRunMutation = useMutation({
    mutationFn: () =>
      mercurAdminClient.vendors.notifications.t30.trigger({ dry_run: true }),
    onSuccess: () => {
      toast.success("Dry-run preview generated")
    },
    onError: () => {
      toast.error("Dry-run failed")
    },
  })

  const triggerMutation = useMutation<TriggerResponse>({
    mutationFn: () =>
      mercurAdminClient.vendors.notifications.t30.trigger<TriggerResponse>({ dry_run: false }),
    onSuccess: (res: TriggerResponse) => {
      toast.success(
        `T-30 dispatch complete: ${res.triggered} sent, ${res.skipped} skipped, ${res.failed} failed`,
      )
      qc.invalidateQueries({ queryKey: ["admin-vendors-t30-audit"] })
      qc.invalidateQueries({ queryKey: ["admin-vendors-t30-preview"] })
      setConfirmOpen(false)
    },
    onError: () => {
      toast.error("T-30 dispatch failed")
      setConfirmOpen(false)
    },
  })

  const eligible = preview?.vendors ?? []
  const auditEntries = log?.entries ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <Container>
        <div className="px-6 py-4">
          <Heading level="h1">T-30 Migration Notification</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Sends BonBeauty multi-vendor migration notice (T-30 days) to all
            `open` lifecycle vendors. Idempotent — already-notified vendors
            are skipped via audit log dedup.
          </Text>
        </div>

        <div className="px-6 pb-4">
          {previewLoading && <Text>Loading eligibility…</Text>}
          {preview && (
            <div className="flex flex-col gap-2">
              <Text>
                <strong>Window opens:</strong> {formatShortDate(preview.window_opens)}
              </Text>
              <Text>
                <strong>Flag flip date:</strong> {formatShortDate(preview.flag_flip_date)}
              </Text>
              <Text>
                <strong>Eligible vendors:</strong> {preview.eligible_count}
              </Text>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-4">
          <Button
            variant="secondary"
            size="small"
            onClick={() => dryRunMutation.mutate()}
            disabled={dryRunMutation.isPending}
            data-testid="t30-dry-run-button"
          >
            {dryRunMutation.isPending ? "Previewing…" : "Dry-run preview"}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => setConfirmOpen(true)}
            disabled={!preview || preview.eligible_count === 0}
            data-testid="t30-send-button"
          >
            Send T-30 notifications
          </Button>
        </div>

        {confirmOpen && (
          <div className="border-ui-border-base bg-ui-bg-subtle mx-6 mb-4 rounded border p-4">
            <Heading level="h3">Confirm T-30 dispatch</Heading>
            <Text className="mt-2">
              About to dispatch T-30 notifications to{" "}
              <strong>{preview?.eligible_count ?? 0}</strong> eligible vendors.
              This action is irreversible (audit log will record each
              dispatch). Already-notified vendors will be skipped.
            </Text>
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                size="small"
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
                data-testid="t30-confirm-button"
              >
                {triggerMutation.isPending ? "Sending…" : "Confirm + send"}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Container>

      <Container>
        <div className="px-6 py-4">
          <Heading level="h2">Eligible vendors</Heading>
        </div>
        <div className="px-6 pb-4">
          {eligible.length === 0 ? (
            <Text className="text-ui-fg-subtle">No eligible vendors at this window.</Text>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-ui-border-strong text-ui-fg-subtle border-b text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">Handle</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Locale</th>
                    <th className="px-3 py-2">Last notified</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((v) => (
                    <tr key={v.id} className="border-ui-border-base border-b text-sm">
                      <td className="px-3 py-2 font-medium">{v.handle}</td>
                      <td className="px-3 py-2">{v.email}</td>
                      <td className="px-3 py-2">
                        <Badge color="green" size="xsmall">
                          {v.lifecycle_status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 uppercase">{v.locale}</td>
                      <td className="text-ui-fg-subtle px-3 py-2">
                        {formatShortDate(v.last_notified_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>

      <Container>
        <div className="px-6 py-4">
          <Heading level="h2">Audit log</Heading>
        </div>
        <div className="px-6 pb-4">
          {auditEntries.length === 0 ? (
            <Text className="text-ui-fg-subtle">No T-30 notifications dispatched yet.</Text>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-ui-border-strong text-ui-fg-subtle border-b text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">Sent at</th>
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Locale</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Triggered by</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((e) => (
                    <tr key={e.id} className="border-ui-border-base border-b text-sm">
                      <td className="px-3 py-2">{formatShortDate(e.sent_at)}</td>
                      <td className="px-3 py-2">{e.vendor_handle ?? e.vendor_id.slice(0, 8)}</td>
                      <td className="px-3 py-2">{e.recipient_email}</td>
                      <td className="px-3 py-2 uppercase">{e.locale}</td>
                      <td className="px-3 py-2">
                        <Badge
                          color={e.status === "sent" ? "green" : "red"}
                          size="xsmall"
                        >
                          {e.status}
                        </Badge>
                      </td>
                      <td className="text-ui-fg-subtle px-3 py-2 font-mono text-xs">
                        {e.triggered_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Text size="xsmall" className="text-ui-fg-subtle mt-3">
                {auditEntries.length} entr{auditEntries.length === 1 ? "y" : "ies"}
              </Text>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
