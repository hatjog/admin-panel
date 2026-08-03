/**
 * Story v160-8-2: T-30 kickoff trigger + per-vendor consent status report.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { mercurAdminClient } from "@lib/mercur-admin-client"

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

type DecisionFilter = "all" | DecisionStatus
type SortOrder =
  | "handle:asc"
  | "decision_status:asc"
  | "decision_at:desc"
  | "nudges_sent:desc"
  | "last_action:desc"

function decisionBadgeColor(
  decision: DecisionStatus,
): "green" | "red" | "orange" {
  switch (decision) {
    case "opted_in":
      return "green"
    case "opted_out":
      return "red"
    default:
      return "orange"
  }
}

function buildConsentQuery(
  filter: DecisionFilter,
  sort: SortOrder,
): Record<string, string> {
  const query: Record<string, string> = { sort }
  if (filter !== "all") {
    query.decision = filter
  }
  return query
}

function downloadCsv(vendors: ConsentVendor[]): void {
  const header = [
    "handle",
    "decision_status",
    "decision_at",
    "nudges_sent",
    "time_remaining_days",
    "last_action",
  ]
  const lines = vendors.map((vendor) =>
    [
      vendor.handle,
      vendor.decision_status,
      vendor.decision_at ?? "",
      String(vendor.nudges_sent),
      vendor.time_remaining_days == null ? "" : String(vendor.time_remaining_days),
      vendor.last_action ?? "",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  )

  const csv = [header.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "operator-kickoff-consents.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export function KickoffPage(): React.JSX.Element {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [adminNote, setAdminNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("handle:asc")

  const kickoffQuery = useQuery<KickoffState>({
    queryKey: ["admin-operator-kickoff"],
    queryFn: () => mercurAdminClient.operator.kickoff.retrieve<KickoffState>(),
  })
  const consentsQuery = useQuery<ConsentReport>({
    queryKey: ["admin-operator-consents", decisionFilter, sortOrder],
    queryFn: () =>
      mercurAdminClient.operator.consents.list<ConsentReport>(
        buildConsentQuery(decisionFilter, sortOrder),
      ),
    staleTime: 30_000,
  })

  const triggerMutation = useMutation({
    mutationFn: () =>
      mercurAdminClient.operator.kickoff.trigger({
        confirm: true,
        admin_note: adminNote,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operator-kickoff"] })
      qc.invalidateQueries({ queryKey: ["admin-operator-consents"] })
      setConfirmOpen(false)
      setAdminNote("")
    },
  })

  const ko = kickoffQuery.data
  const consents = consentsQuery.data
  const triggered = !!ko?.state
  const isLoading = kickoffQuery.isLoading || consentsQuery.isLoading
  const isError = kickoffQuery.isError || consentsQuery.isError

  const refreshAll = () => {
    void kickoffQuery.refetch()
    void consentsQuery.refetch()
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">{t("operator.kickoff.title")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("operator.kickoff.subtitle")}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refreshAll}>
            {t("operator.kickoff.refresh")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => consents && downloadCsv(consents.vendors)}
            disabled={!consents || consents.vendors.length === 0}
          >
            {t("operator.kickoff.export_csv")}
          </Button>
        </div>
      </div>

      {isLoading && <Text>{t("labels.loading")}</Text>}

      {isError && (
        <div className="mb-4 rounded-md border border-ui-border-error bg-ui-bg-error p-4">
          <Text>{t("operator.kickoff.error")}</Text>
        </div>
      )}

      <div className="mb-6 rounded-md border border-ui-border-base p-4">
        {triggered ? (
          <>
            <Text>
              {t("operator.kickoff.window_started_at")}: {new Date(ko!.state!.started_at).toLocaleString()}
            </Text>
            <Text>
              {t("operator.kickoff.t0_target")}: {new Date(ko!.state!.t0_target).toLocaleString()}
            </Text>
            <Text>
              {t("operator.kickoff.days_remaining")}: {ko!.days_remaining ?? "—"}
            </Text>
            <Button className="mt-3" disabled>
              {t("operator.kickoff.already_triggered")}
            </Button>
          </>
        ) : (
          <>
            <Text className="text-ui-fg-subtle">
              {t("operator.kickoff.window_not_started")}
            </Text>
            {!confirmOpen && (
              <Button className="mt-3" onClick={() => setConfirmOpen(true)}>
                {t("operator.kickoff.trigger_cta")}
              </Button>
            )}
            {confirmOpen && (
              <div className="mt-3">
                <Text>
                  {t("operator.kickoff.trigger_confirm_title")}
                </Text>
                <Text className="mt-1 text-ui-fg-subtle">
                  {t("operator.kickoff.trigger_confirm_message")}
                </Text>
                <Input
                  className="mt-2"
                  placeholder={t("operator.kickoff.admin_note_placeholder")}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={() => triggerMutation.mutate()}
                    disabled={triggerMutation.isPending}
                  >
                    {t("operator.kickoff.confirm")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmOpen(false)}
                  >
                    {t("operator.kickoff.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {consents && (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            <Badge color="green">
              {t("operator.kickoff.decision_opted_in")}: {consents.summary.opted_in}
            </Badge>
            <Badge color="red">
              {t("operator.kickoff.decision_opted_out")}: {consents.summary.opted_out}
            </Badge>
            <Badge color="orange">
              {t("operator.kickoff.decision_no_decision")}: {consents.summary.no_decision}
            </Badge>
            <Badge color="blue">
              {t("operator.kickoff.summary_total")}: {consents.summary.total}
            </Badge>
          </div>

          <div className="mb-3 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Text size="small">{t("operator.kickoff.filter_label")}</Text>
              <select
                className="rounded-md border border-ui-border-base px-2 py-1"
                value={decisionFilter}
                onChange={(event) =>
                  setDecisionFilter(event.target.value as DecisionFilter)
                }
              >
                <option value="all">{t("operator.kickoff.filter_all")}</option>
                <option value="opted_in">{t("operator.kickoff.decision_opted_in")}</option>
                <option value="opted_out">{t("operator.kickoff.decision_opted_out")}</option>
                <option value="no_decision">{t("operator.kickoff.decision_no_decision")}</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Text size="small">{t("operator.kickoff.sort_label")}</Text>
              <select
                className="rounded-md border border-ui-border-base px-2 py-1"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              >
                <option value="handle:asc">{t("operator.kickoff.sort_handle_asc")}</option>
                <option value="decision_status:asc">{t("operator.kickoff.sort_decision_asc")}</option>
                <option value="decision_at:desc">{t("operator.kickoff.sort_decision_at_desc")}</option>
                <option value="nudges_sent:desc">{t("operator.kickoff.sort_nudges_desc")}</option>
                <option value="last_action:desc">{t("operator.kickoff.sort_last_action_desc")}</option>
              </select>
            </label>
          </div>

          {consents.vendors.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.kickoff.empty")}</Text>
          ) : (
            <div className="overflow-x-auto rounded-md border border-ui-border-base">
              <table className="min-w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("operator.kickoff.consent_table_handle")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.kickoff.consent_table_decision")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.kickoff.consent_table_decision_at")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.kickoff.consent_table_nudges")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.kickoff.consent_table_time_remaining")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.kickoff.consent_table_last_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.vendors.map((v) => (
                    <tr key={v.id} className="border-t border-ui-border-base">
                      <td className="px-3 py-2">{v.handle}</td>
                      <td className="px-3 py-2">
                        <Badge color={decisionBadgeColor(v.decision_status)}>
                          {t(`operator.kickoff.decision_${v.decision_status}`)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{v.decision_at ?? "—"}</td>
                      <td className="px-3 py-2">{v.nudges_sent}</td>
                      <td className="px-3 py-2">{v.time_remaining_days ?? "—"}</td>
                      <td className="px-3 py-2">{v.last_action ?? "—"}</td>
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
