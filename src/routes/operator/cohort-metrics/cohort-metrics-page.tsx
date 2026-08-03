/**
 * Story v160-8-4: Post-flip cohort metrics 4×4 + zero-opt-in cascade.
 */

import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { mercurAdminClient } from "@lib/mercur-admin-client"

import { CohortCompareChart } from "./components/CohortCompareChart"
import { CohortGrid } from "./components/CohortGrid"
import { ZeroOptInCascadePanel } from "./components/ZeroOptInCascadePanel"

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

export function CohortMetricsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useQuery<Result>({
    queryKey: ["admin-operator-cohort-metrics"],
    queryFn: () => mercurAdminClient.operator.cohortMetrics.retrieve<Result>(),
  })
  const { data: cascade } = useQuery<Cascade>({
    queryKey: ["admin-operator-zero-opt-in-cascade"],
    queryFn: () => mercurAdminClient.operator.cohortMetrics.zeroOptInCascade<Cascade>(),
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

      {cascade && <ZeroOptInCascadePanel cascade={cascade} />}

      {isError && (
        <Text className="mb-4 text-ui-fg-error">{t("operator.cohort_metrics.error")}</Text>
      )}

      {isLoading && !data && (
        <Text className="mb-4 text-ui-fg-subtle">{t("labels.loading")}</Text>
      )}

      {data && (
        <div className="space-y-4">
          <CohortGrid cohorts={data.cohorts} />
          <CohortCompareChart cohorts={data.cohorts} />
        </div>
      )}

      {!isLoading && !data && !isError && (
        <Text className="text-ui-fg-subtle">{t("operator.cohort_metrics.empty_pre_flip")}</Text>
      )}
    </Container>
  )
}
