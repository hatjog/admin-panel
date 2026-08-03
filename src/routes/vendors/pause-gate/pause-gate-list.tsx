/**
 * Story v160-7-4: Vendor pause gate list page (admin-panel).
 *
 * Per Sprint 4 Wave 15 batch — FR35 admin pause gate. Single-pane gate review
 * before flag flip; per-vendor 5-item completeness checklist + state machine.
 */

import { useMemo, useState } from "react"
import { Badge, Button, Container, Heading, Input, Select, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type LifecycleStatus = "pending_approval" | "open" | "suspended" | "terminated"

type PauseGateVendor = {
  id: string
  handle: string
  email: string
  lifecycle_status: LifecycleStatus
  decision_status: "opted_in" | "opted_out" | "pending"
  completeness: { complete: number; total: number }
  last_action_at: string | null
}

type ListResponse = {
  vendors: PauseGateVendor[]
  total: number
  page: number
  limit: number
}

function statusBadgeColor(s: LifecycleStatus): "blue" | "green" | "orange" | "red" {
  switch (s) {
    case "open":
      return "green"
    case "suspended":
      return "orange"
    case "terminated":
      return "red"
    default:
      return "blue"
  }
}

export function VendorPauseGateListPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | "all">(
    "pending_approval",
  )
  const [completenessFilter, setCompletenessFilter] = useState<
    "complete" | "incomplete" | "all"
  >("all")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: [
      "admin-vendors-pause-gate",
      statusFilter,
      completenessFilter,
      search,
    ],
    queryFn: () =>
      mercurAdminClient.vendors.pauseGate.list<ListResponse>({
        status: statusFilter,
        completeness:
          completenessFilter !== "all" ? completenessFilter : undefined,
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  })

  const vendors = useMemo(() => data?.vendors ?? [], [data])

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Vendor Pause Gate</Heading>
        <Text className="text-ui-fg-subtle">
          Pre-flag-flip review — approve or pause per-vendor.
        </Text>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as LifecycleStatus | "all")
          }
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="Status" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="pending_approval">Pending approval</Select.Item>
            <Select.Item value="open">Open</Select.Item>
            <Select.Item value="suspended">Suspended</Select.Item>
            <Select.Item value="terminated">Terminated</Select.Item>
          </Select.Content>
        </Select>

        <Select
          value={completenessFilter}
          onValueChange={(v) =>
            setCompletenessFilter(v as "complete" | "incomplete" | "all")
          }
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="Completeness" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="complete">Complete</Select.Item>
            <Select.Item value="incomplete">Incomplete</Select.Item>
          </Select.Content>
        </Select>

        <Input
          placeholder="Search vendor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading && <Text>Loading…</Text>}

      {!isLoading && vendors.length === 0 && (
        <div className="rounded-md border border-dashed border-ui-border-base p-8 text-center">
          <Text className="text-ui-fg-subtle">
            No vendors pending gate review.
          </Text>
        </div>
      )}

      {!isLoading && vendors.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ui-border-base">
          <table className="min-w-full text-sm">
            <thead className="bg-ui-bg-subtle">
              <tr>
                <th className="px-3 py-2 text-left">Handle</th>
                <th className="px-3 py-2 text-left">Lifecycle</th>
                <th className="px-3 py-2 text-left">Decision</th>
                <th className="px-3 py-2 text-left">Completeness</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-t border-ui-border-base">
                  <td className="px-3 py-2 font-medium">{v.handle}</td>
                  <td className="px-3 py-2">
                    <Badge color={statusBadgeColor(v.lifecycle_status)}>
                      {v.lifecycle_status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{v.decision_status}</td>
                  <td className="px-3 py-2 font-mono">
                    {v.completeness.complete}/{v.completeness.total}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => {
                        window.location.href = `/app/vendors/pause-gate/${v.id}`
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
