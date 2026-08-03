import { Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { KPIMeasurement } from "./KPICard"

type Cohort =
  | "pre_flip_baseline"
  | "shadow_window"
  | "first_24h_on"
  | "sustained_on"

type KPI = "nps" | "conversion" | "p95_latency_ms" | "error_rate_pct"

const COHORTS: Cohort[] = [
  "pre_flip_baseline",
  "shadow_window",
  "first_24h_on",
  "sustained_on",
]

const KPIS: KPI[] = ["nps", "conversion", "p95_latency_ms", "error_rate_pct"]

function resolveBarHeight(value: number | null, maxValue: number): number {
  if (value == null || maxValue <= 0) {
    return 8
  }

  return Math.max(8, Math.round((value / maxValue) * 48))
}

export function CohortCompareChart({
  cohorts,
}: {
  cohorts: Record<Cohort, Record<KPI, KPIMeasurement>>
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="rounded-md border border-ui-border-base p-4">
      <Heading level="h2" className="mb-3 text-base">
        {t("operator.cohort_metrics.compare_label")}
      </Heading>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => {
          const values = COHORTS.map((cohort) => cohorts[cohort][kpi].value)
          const numericValues = values.filter((value): value is number => value != null)
          const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0

          return (
            <div key={kpi} className="rounded-md bg-ui-bg-subtle p-3">
              <Text size="small" weight="plus">
                {t(`operator.cohort_metrics.kpi_${kpi}`)}
              </Text>
              <div className="mt-3 flex min-h-16 items-end gap-2">
                {COHORTS.map((cohort) => {
                  const measurement = cohorts[cohort][kpi]
                  return (
                    <div key={cohort} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm bg-ui-fg-interactive"
                        style={{ height: `${resolveBarHeight(measurement.value, maxValue)}px` }}
                      />
                      <Text size="xsmall" className="text-center text-ui-fg-subtle">
                        {measurement.value ?? "—"}
                      </Text>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}