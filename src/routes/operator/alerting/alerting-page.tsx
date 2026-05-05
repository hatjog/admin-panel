/**
 * Story v160-8-5: Operator alerting page — firing alerts + 24h history +
 * configured thresholds.
 */

import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "@lib/client"

type AlertConfig = {
  id: string
  severity: "P1" | "P2" | "P3"
  nfr_ref: string
  condition: string
  evaluation_window: string
  action: "auto_rollback" | "page" | "alert"
  recipients: string[]
}

type FiringAlert = AlertConfig & {
  firing_since: string
  evaluated_value: string | number | null
}

type Result = {
  firing: FiringAlert[]
  history_24h: Array<{ alert_id: string; severity: string; action: string; firing_since: string }>
  auto_rollback_history: Array<{ audit_log_id: string; alert_id: string | null; at: string; reason: string | null }>
  configured: AlertConfig[]
  computed_at: string
}

function sevColor(s: string): "red" | "orange" | "blue" {
  return s === "P1" ? "red" : s === "P2" ? "orange" : "blue"
}

function getAlertLabelKey(id: string): string {
  switch (id) {
    case "nfr_alert_1_p95_latency":
      return "operator.alerting.alert_label_p95_latency"
    case "nfr_alert_2_5xx_error_rate":
      return "operator.alerting.alert_label_5xx_rate"
    case "nfr_alert_3_zero_opted_in":
      return "operator.alerting.alert_label_zero_opted_in"
    case "nfr_alert_4_conversion_drop":
      return "operator.alerting.alert_label_conversion_drop"
    case "nfr_alert_5_cache_invalidate_failures":
      return "operator.alerting.alert_label_cache_failures"
    case "nfr_alert_6_vendor_lifecycle_anomaly":
      return "operator.alerting.alert_label_lifecycle_anomaly"
    case "nfr_alert_7_kickoff_no_decision_breach":
      return "operator.alerting.alert_label_kickoff_no_decision"
    case "nfr_alert_8_smoke_gate_drift":
      return "operator.alerting.alert_label_smoke_gate_drift"
    default:
      return "operator.alerting.alert_id"
  }
}

export function AlertingPage(): React.JSX.Element {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery<Result>({
    queryKey: ["admin-operator-alerting"],
    queryFn: () => sdk.client.fetch("/admin/operator/alerting"),
  })

  const reEval = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/operator/alerting", { method: "POST" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-operator-alerting"] }),
  })

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">{t("operator.alerting.title")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("operator.alerting.subtitle")}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
            {t("actions.refresh")}
          </Button>
          <Button onClick={() => reEval.mutate()} disabled={reEval.isPending}>
            {t("operator.alerting.re_evaluate")}
          </Button>
        </div>
      </div>

      {isError && (
        <Text className="mb-4 text-ui-fg-error">{t("operator.alerting.error")}</Text>
      )}

      {isLoading && !data && (
        <Text className="mb-4 text-ui-fg-subtle">{t("labels.loading")}</Text>
      )}

      {data && (
        <>
          <Heading level="h3" className="mb-2">
            {t("operator.alerting.firing")} ({data.firing.length})
          </Heading>
          {data.firing.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.alerting.no_firing")}</Text>
          ) : (
            <ul className="mb-4">
              {data.firing.map((a) => (
                <li
                  key={a.id}
                  className="mb-2 rounded-md border border-ui-border-base p-3"
                >
                  <Badge color={sevColor(a.severity)}>
                    {t(`operator.alerting.severity_${a.severity.toLowerCase()}`)}
                  </Badge>
                  <Text className="ml-2 inline">{t(getAlertLabelKey(a.id), { defaultValue: a.id })}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {a.condition} {"->"} {t("operator.alerting.action")}: {t(`operator.alerting.action_${a.action}`)}
                  </Text>
                </li>
              ))}
            </ul>
          )}

          <Heading level="h3" className="mb-2">
            {t("operator.alerting.configured")} ({data.configured.length})
          </Heading>
          {data.configured.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.alerting.empty")}</Text>
          ) : (
          <div className="overflow-x-auto rounded-md border border-ui-border-base">
            <table className="min-w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">{t("operator.alerting.alert_id")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.alerting.severity")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.alerting.nfr_ref")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.alerting.evaluation_window")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.alerting.action")}</th>
                </tr>
              </thead>
              <tbody>
                {data.configured.map((a) => (
                  <tr key={a.id} className="border-t border-ui-border-base">
                    <td className="px-3 py-2 font-mono text-xs">
                      {t(getAlertLabelKey(a.id), { defaultValue: a.id })}
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={sevColor(a.severity)}>
                        {t(`operator.alerting.severity_${a.severity.toLowerCase()}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{a.nfr_ref}</td>
                    <td className="px-3 py-2">{a.evaluation_window}</td>
                    <td className="px-3 py-2">{t(`operator.alerting.action_${a.action}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          <Heading level="h3" className="mb-2 mt-6">
            {t("operator.alerting.history_24h")} ({data.history_24h.length})
          </Heading>
          {data.history_24h.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.alerting.no_firing")}</Text>
          ) : (
            <div className="overflow-x-auto rounded-md border border-ui-border-base">
              <table className="min-w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("operator.alerting.alert_id")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.alerting.severity")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.alerting.action")}</th>
                    <th className="px-3 py-2 text-left">{t("fields.createdAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history_24h.map((entry) => (
                    <tr key={`${entry.alert_id}-${entry.firing_since}`} className="border-t border-ui-border-base">
                      <td className="px-3 py-2">{t(getAlertLabelKey(entry.alert_id), { defaultValue: entry.alert_id })}</td>
                      <td className="px-3 py-2">{t(`operator.alerting.severity_${entry.severity.toLowerCase()}`)}</td>
                      <td className="px-3 py-2">{t(`operator.alerting.action_${entry.action}`)}</td>
                      <td className="px-3 py-2">{new Date(entry.firing_since).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Heading level="h3" className="mb-2 mt-6">
            {t("operator.alerting.auto_rollback_history")} ({data.auto_rollback_history.length})
          </Heading>
          {data.auto_rollback_history.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.alerting.empty")}</Text>
          ) : (
            <div className="overflow-x-auto rounded-md border border-ui-border-base">
              <table className="min-w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("operator.alerting.alert_id")}</th>
                    <th className="px-3 py-2 text-left">{t("fields.createdAt")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.flag_flip.audit_table_note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auto_rollback_history.map((entry) => (
                    <tr key={entry.audit_log_id} className="border-t border-ui-border-base">
                      <td className="px-3 py-2">
                        {entry.alert_id
                          ? t(getAlertLabelKey(entry.alert_id), { defaultValue: entry.alert_id })
                          : "-"}
                      </td>
                      <td className="px-3 py-2">{new Date(entry.at).toLocaleString()}</td>
                      <td className="px-3 py-2">{entry.reason ?? "-"}</td>
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
