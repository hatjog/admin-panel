/**
 * Story v160-8-2: T-30 kickoff trigger + per-vendor consent status report.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/client"

type KickoffState = {
  state: {
    started_at: string
    t0_target: string
    triggered_by: string
    vendor_count: number
    admin_note?: string
  } | null
  days_remaining: number | null
}

type DecisionStatus = "opted_in" | "opted_out" | "no_decision"

type ConsentVendor = {
  id: string
  handle: string
  decision_status: DecisionStatus
  decision_at: string | null
  nudges_sent: number
  time_remaining_days: number | null
  last_action: string | null
}

type ConsentReport = {
  window: { started_at: string; t0_target: string; days_remaining: number } | null
  vendors: ConsentVendor[]
  summary: {
    opted_in: number
    opted_out: number
    no_decision: number
    total: number
  }
  page: number
  limit: number
  total: number
}

export function KickoffPage(): React.JSX.Element {
  const qc = useQueryClient()
  const [adminNote, setAdminNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: ko } = useQuery<KickoffState>({
    queryKey: ["admin-operator-kickoff"],
    queryFn: () => sdk.client.fetch("/admin/operator/kickoff"),
  })
  const { data: consents } = useQuery<ConsentReport>({
    queryKey: ["admin-operator-consents"],
    queryFn: () => sdk.client.fetch("/admin/operator/consents"),
    staleTime: 30_000,
  })

  const triggerMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/operator/kickoff", {
        method: "POST",
        body: { confirm: true, admin_note: adminNote },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operator-kickoff"] })
      setConfirmOpen(false)
    },
  })

  const triggered = !!ko?.state

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">T-30 Kickoff</Heading>
        <Text className="text-ui-fg-subtle">
          Trigger T-30 window + live per-vendor consent status.
        </Text>
      </div>

      <div className="mb-6 rounded-md border border-ui-border-base p-4">
        {triggered ? (
          <>
            <Text>
              Started: {new Date(ko!.state!.started_at).toLocaleString()}
            </Text>
            <Text>
              T-0 target: {new Date(ko!.state!.t0_target).toLocaleString()}
            </Text>
            <Text>Days remaining: {ko!.days_remaining ?? "—"}</Text>
            <Button className="mt-3" disabled>
              Already triggered
            </Button>
          </>
        ) : (
          <>
            <Text className="text-ui-fg-subtle">
              T-30 window not yet triggered.
            </Text>
            {!confirmOpen && (
              <Button className="mt-3" onClick={() => setConfirmOpen(true)}>
                Trigger T-30 kickoff
              </Button>
            )}
            {confirmOpen && (
              <div className="mt-3">
                <Text>
                  Irreversible: dispatches T-30 notifications + writes audit log.
                </Text>
                <Input
                  className="mt-2"
                  placeholder="Admin note (optional)"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={() => triggerMutation.mutate()}
                    disabled={triggerMutation.isPending}
                  >
                    Confirm + trigger
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {consents && (
        <>
          <div className="mb-3 flex gap-3">
            <Badge color="green">Opted-in: {consents.summary.opted_in}</Badge>
            <Badge color="red">Opted-out: {consents.summary.opted_out}</Badge>
            <Badge color="orange">
              No decision: {consents.summary.no_decision}
            </Badge>
            <Badge color="blue">Total: {consents.summary.total}</Badge>
          </div>
          {consents.vendors.length === 0 ? (
            <Text className="text-ui-fg-subtle">No vendors in scope yet.</Text>
          ) : (
            <div className="overflow-x-auto rounded-md border border-ui-border-base">
              <table className="min-w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left">Handle</th>
                    <th className="px-3 py-2 text-left">Decision</th>
                    <th className="px-3 py-2 text-left">Decision at</th>
                    <th className="px-3 py-2 text-left">Nudges</th>
                    <th className="px-3 py-2 text-left">Time remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.vendors.map((v) => (
                    <tr key={v.id} className="border-t border-ui-border-base">
                      <td className="px-3 py-2">{v.handle}</td>
                      <td className="px-3 py-2">{v.decision_status}</td>
                      <td className="px-3 py-2">{v.decision_at ?? "—"}</td>
                      <td className="px-3 py-2">{v.nudges_sent}</td>
                      <td className="px-3 py-2">{v.time_remaining_days ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Container>
  )
}
