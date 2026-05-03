/**
 * Story v160-8-7: Phase B SMOKE GATE binary checklist + ratify CTA.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/client"

type ItemStatus = "pass" | "fail" | "unknown"

type Item = {
  key: string
  label: string
  nfr_ref: string
  status: ItemStatus
  evidence_url: string
  source: string
}

type State = {
  items: Item[]
  computed: "pass" | "fail" | "pending"
  last_ratified: {
    verdict: "pass" | "fail"
    admin_id: string
    admin_note: string
    ratified_at: string
  } | null
  computed_at: string
}

function color(s: ItemStatus): "green" | "red" | "blue" {
  return s === "pass" ? "green" : s === "fail" ? "red" : "blue"
}

export function SmokeGatePage(): React.JSX.Element {
  const qc = useQueryClient()
  const [adminNote, setAdminNote] = useState("")
  const [confirming, setConfirming] = useState(false)

  const { data } = useQuery<State>({
    queryKey: ["admin-operator-smoke-gate"],
    queryFn: () => sdk.client.fetch("/admin/operator/smoke-gate-status"),
  })

  const ratify = useMutation({
    mutationFn: (verdict: "pass" | "fail") =>
      sdk.client.fetch("/admin/operator/smoke-gate-ratify", {
        method: "POST",
        body: { verdict, admin_note: adminNote },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operator-smoke-gate"] })
      setConfirming(false)
      setAdminNote("")
    },
  })

  const allPass = data?.items.every((i) => i.status === "pass")
  const anyFail = data?.items.some((i) => i.status === "fail")

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Phase B SMOKE GATE</Heading>
        <Text className="text-ui-fg-subtle">
          Binary PASS/FAIL ratification — HARD GATE blocking flag flip
          (Story 8.3).
        </Text>
      </div>

      {data && (
        <>
          <div className="mb-4 rounded-md border border-ui-border-base p-4">
            <Badge color={data.computed === "pass" ? "green" : data.computed === "fail" ? "red" : "blue"}>
              Computed: {data.computed.toUpperCase()}
            </Badge>
            {data.last_ratified && (
              <Text className="ml-3 inline">
                Last ratified: {data.last_ratified.verdict.toUpperCase()} by{" "}
                {data.last_ratified.admin_id} at{" "}
                {new Date(data.last_ratified.ratified_at).toLocaleString()}
              </Text>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border border-ui-border-base">
            <table className="min-w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">NFR</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.key} className="border-t border-ui-border-base">
                    <td className="px-3 py-2">{it.label}</td>
                    <td className="px-3 py-2">{it.nfr_ref}</td>
                    <td className="px-3 py-2">
                      <Badge color={color(it.status)}>{it.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <a
                        className="text-ui-fg-interactive underline"
                        href={it.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        view
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            {!confirming && (
              <Button
                disabled={!allPass}
                onClick={() => setConfirming(true)}
              >
                Ratify verdict
              </Button>
            )}
            {anyFail && (
              <Text className="ml-3 text-ui-fg-error inline">
                Cannot ratify PASS while any item has status=fail.
              </Text>
            )}
            {confirming && (
              <div className="mt-3 rounded-md border border-ui-border-base p-3">
                <Input
                  placeholder="Admin note (required)"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => ratify.mutate("pass")} disabled={ratify.isPending}>
                    Ratify PASS
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => ratify.mutate("fail")}
                    disabled={ratify.isPending}
                  >
                    Ratify FAIL
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Container>
  )
}
