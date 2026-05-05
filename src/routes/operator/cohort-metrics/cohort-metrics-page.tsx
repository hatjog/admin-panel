/**
 * Story v160-8-4: Post-flip cohort metrics 4×4 + zero-opt-in cascade.
 */

import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "@lib/client"

type Cohort =
  | "pre_flip_baseline"
  | "shadow_window"
  | "first_24h_on"
  | "sustained_on"
type KPI = "nps" | "conversion" | "p95_latency_ms" | "error_rate_pct"

type KPIMeasurement = {
  value: number | null
  sample_size: number
  threshold: string
  status: "green" | "yellow" | "red" | "unknown"
}

type Result = {
  cohorts: Record<Cohort, Record<KPI, KPIMeasurement>>
  computed_at: string
}

type Cascade = {
  opted_in_count: number
  cascade_active: boolean
  current_step: string
  recommended_action: string
  remediation_url: string
}

const COHORTS: Cohort[] = [
  "pre_flip_baseline",
  "shadow_window",
  "first_24h_on",
  "sustained_on",
]
const KPIS: KPI[] = ["nps", "conversion", "p95_latency_ms", "error_rate_pct"]

function statusColor(s: KPIMeasurement["status"]): "green" | "orange" | "red" | "blue" {
  return s === "green"
    ? "green"
    : s === "yellow"
      ? "orange"
      : s === "red"
        ? "red"
        : "blue"
}

function getCascadeStepKey(step: string): string {
  switch (step) {
    case "none":
      return "operator.zero_opt_in_cascade.step_none"
    case "retrigger_t30":
      return "operator.zero_opt_in_cascade.step_retrigger_t30"
    case "escalate":
      return "operator.zero_opt_in_cascade.step_escalate"
    case "suspend":
      return "operator.zero_opt_in_cascade.step_suspend"
    case "rollback_to_shadow":
      return "operator.zero_opt_in_cascade.step_rollback_to_shadow"
    default:
      return "operator.zero_opt_in_cascade.current_step_label"
  }
}

export function CohortMetricsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useQuery<Result>({
    queryKey: ["admin-operator-cohort-metrics"],
    queryFn: () => sdk.client.fetch("/admin/operator/cohort-metrics"),
  })
  const { data: cascade } = useQuery<Cascade>({
    queryKey: ["admin-operator-zero-opt-in-cascade"],
    queryFn: () => sdk.client.fetch("/admin/operator/zero-opt-in-cascade"),
  })

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">{t("operator.cohort_metrics.title")}</Heading>
        <Text className="text-ui-fg-subtle">
          {t("operator.cohort_metrics.subtitle")}
        </Text>
        <button className="mt-2 text-ui-fg-interactive underline" onClick={() => refetch()}>
          {t("operator.cohort_metrics.refresh")}
        </button>
      </div>

      {cascade?.cascade_active && (
        <div className="mb-4 rounded-md border border-ui-border-error p-3">
          <Heading level="h3">
            {t("operator.zero_opt_in_cascade.title")} {t("operator.zero_opt_in_cascade.active")}
          </Heading>
          <Text>
            {t("operator.zero_opt_in_cascade.current_step_label")}: {t(getCascadeStepKey(cascade.current_step), { defaultValue: cascade.current_step })}
          </Text>
          <Text>
            {t("operator.zero_opt_in_cascade.recommended_action")}: {cascade.recommended_action}
          </Text>
          <a className="text-ui-fg-interactive underline" href={cascade.remediation_url}>
            {t("operator.zero_opt_in_cascade.open_remediation")}
          </a>
        </div>
      )}

      {isError && (
        <Text className="mb-4 text-ui-fg-error">{t("operator.cohort_metrics.error")}</Text>
      )}

      {isLoading && !data && (
        <Text className="mb-4 text-ui-fg-subtle">{t("labels.loading")}</Text>
      )}

      {data && (
        <div className="overflow-x-auto rounded-md border border-ui-border-base">
          <table className="min-w-full text-sm">
            <thead className="bg-ui-bg-subtle">
              <tr>
                <th className="px-3 py-2 text-left">{t("operator.cohort_metrics.compare_label")}</th>
                {KPIS.map((k) => (
                  <th key={k} className="px-3 py-2 text-left">
                    {t(`operator.cohort_metrics.kpi_${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORTS.map((c) => (
                <tr key={c} className="border-t border-ui-border-base">
                  <td className="px-3 py-2 font-medium">{t(`operator.cohort_metrics.cohort_${c}`)}</td>
                  {KPIS.map((k) => {
                    const m = data.cohorts[c][k]
                    return (
                      <td key={k} className="px-3 py-2">
                        <Badge color={statusColor(m.status)}>
                          {m.value ?? "—"}
                        </Badge>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {t("operator.cohort_metrics.sample_size_label")}={m.sample_size}; {m.threshold}
                        </Text>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !data && !isError && (
        <Text className="text-ui-fg-subtle">{t("operator.cohort_metrics.empty_pre_flip")}</Text>
      )}
    </Container>
  )
}
