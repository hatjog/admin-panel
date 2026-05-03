/**
 * Story v160-7-6: Admin training cert review queue (admin-panel).
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Select, Text } from "@medusajs/ui"

type CertStatus = "pending_review" | "verified" | "rejected"

type CertQueueItem = {
  id: string
  handle: string
  decision_status: "opted_in" | "opted_out"
  uploaded_at: string
  status: CertStatus
}

const STUB_QUEUE: CertQueueItem[] = []

export function VendorTrainingCertQueuePage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<CertStatus | "all">("pending_review")
  const [search, setSearch] = useState("")

  const items = STUB_QUEUE.filter((it) => {
    if (statusFilter !== "all" && it.status !== statusFilter) return false
    if (search && !it.handle.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pendingCount = STUB_QUEUE.filter((it) => it.status === "pending_review").length

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Training Cert Review Queue</Heading>
        <Text className="text-ui-fg-subtle">
          Review vendor training certificate uploads. Pending: {pendingCount}.
        </Text>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as CertStatus | "all")}
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="Status" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="pending_review">Pending review</Select.Item>
            <Select.Item value="verified">Verified</Select.Item>
            <Select.Item value="rejected">Rejected</Select.Item>
          </Select.Content>
        </Select>

        <Input
          placeholder="Search vendor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-ui-border-base p-8 text-center">
          <Text className="text-ui-fg-subtle">
            No certificates require review.
          </Text>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-ui-border-base">
          <table className="min-w-full text-sm">
            <thead className="bg-ui-bg-subtle">
              <tr>
                <th className="px-3 py-2 text-left">Handle</th>
                <th className="px-3 py-2 text-left">Decision</th>
                <th className="px-3 py-2 text-left">Uploaded</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-ui-border-base">
                  <td className="px-3 py-2 font-medium">{it.handle}</td>
                  <td className="px-3 py-2">{it.decision_status}</td>
                  <td className="px-3 py-2">{it.uploaded_at}</td>
                  <td className="px-3 py-2">
                    <Badge color={it.status === "verified" ? "green" : it.status === "rejected" ? "red" : "blue"}>
                      {it.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => {
                        window.location.href = `/app/vendors/training-certs/${it.id}`
                      }}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}
