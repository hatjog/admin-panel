import { useTranslation } from "react-i18next"

import { KPICard, type KPIMeasurement } from "./KPICard"

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

export function CohortGrid({
  cohorts,
}: {
  cohorts: Record<Cohort, Record<KPI, KPIMeasurement>>
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto rounded-md border border-ui-border-base">
      <table className="min-w-full text-sm">
        <thead className="bg-ui-bg-subtle">
          <tr>
            <th className="px-3 py-2 text-left">{t("operator.cohort_metrics.compare_label")}</th>
            {KPIS.map((kpi) => (
              <th key={kpi} className="px-3 py-2 text-left">
                {t(`operator.cohort_metrics.kpi_${kpi}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COHORTS.map((cohort) => (
            <tr key={cohort} className="border-t border-ui-border-base align-top">
              <td className="px-3 py-2 font-medium">
                {t(`operator.cohort_metrics.cohort_${cohort}`)}
              </td>
              {KPIS.map((kpi) => (
                <td key={kpi} className="px-3 py-2">
                  <KPICard measurement={cohorts[cohort][kpi]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}