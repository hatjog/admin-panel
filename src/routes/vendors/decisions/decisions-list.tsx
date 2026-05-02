/**
 * Story v160-7-3: Vendor decisions list page (admin-panel).
 *
 * Lists all vendors with decision status (pending / opted_in / opted_out / forced).
 * Per-row CTA navigates to /vendors/decisions/[id] detail page for capture.
 *
 * Per Sprint 4 Wave 15 batch — FR34 admin decision capture canonical surface.
 */

import { useMemo, useState } from "react"
import { Badge, Button, Container, Heading, Input, Select, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@lib/client"

type DecisionStatus = "pending" | "opted_in" | "opted_out" | "forced"

type VendorDecisionListEntry = {
  id: string
  handle: string
  email: string
  lifecycle_status: string
  decision_status: DecisionStatus
  last_action_at: string | null
}

type ListResponse = {
  vendors: VendorDecisionListEntry[]
  total: number
  page: number
  limit: number
}

function decisionStatusVariant(s: DecisionStatus): "blue" | "green" | "red" | "orange" {
  switch (s) {
    case "opted_in":
      return "green"
    case "opted_out":
      return "red"
    case "forced":
      return "orange"
    default:
      return "blue"
  }
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toISOString().slice(0, 10)
}

export function VendorDecisionsListPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "all">("all")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["admin-vendors-decisions", statusFilter, search],
    queryFn: () =>
      sdk.client.fetch("/admin/vendors/decisions", {
        query: {
          status: statusFilter,
          search: search.trim() || undefined,
        },
      }),
    staleTime: 30_000,
  })

  const vendors = useMemo(() => data?.vendors ?? [], [data])

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Vendor Decisions</Heading>
        <Text className="text-ui-fg-subtle">
          Capture vendor opt-in/opt-out decisions before flag flip.
        </Text>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as DecisionStatus | "all")}
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="All statuses" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="pending">Pending</Select.Item>
            <Select.Item value="opted_in">Opted-in</Select.Item>
            <Select.Item value="opted_out">Opted-out</Select.Item>
            <Select.Item value="forced">Forced</Select.Item>
          </Select.Content>
        </Select>

        <Input
          placeholder="Search vendor handle / email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading && <Text>Loading…</Text>}

      {!isLoading && vendors.length === 0 && (
        <div className="rounded-md border border-dashed border-ui-border-base p-8 text-center">
          <Text className="text-ui-fg-subtle">
            No vendors require decision capture.
          </Text>
        </div>
      )}

      {!isLoading && vendors.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ui-border-base">
          <table className="min-w-full text-sm">
            <thead className="bg-ui-bg-subtle">
              <tr>
                <th className="px-3 py-2 text-left">Handle</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Lifecycle</th>
                <th className="px-3 py-2 text-left">Decision</th>
                <th className="px-3 py-2 text-left">Last action</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-t border-ui-border-base">
                  <td className="px-3 py-2 font-medium">{v.handle}</td>
                  <td className="px-3 py-2">{v.email}</td>
                  <td className="px-3 py-2">
                    <Badge color="grey">{v.lifecycle_status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={decisionStatusVariant(v.decision_status)}>
                      {v.decision_status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-ui-fg-subtle">
                    {formatShortDate(v.last_action_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => {
                        window.location.href = `/app/vendors/decisions/${v.id}`
                      }}
                    >
                      Capture decision
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
