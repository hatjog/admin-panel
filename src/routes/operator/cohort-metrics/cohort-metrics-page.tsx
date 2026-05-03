/**
 * Story v160-8-4: Post-flip cohort metrics 4×4 + zero-opt-in cascade.
 */

import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
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

export function CohortMetricsPage(): React.JSX.Element {
  const { data } = useQuery<Result>({
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
        <Heading level="h1">Cohort Metrics</Heading>
        <Text className="text-ui-fg-subtle">
          4 cohorts × 4 KPIs (NPS / conversion / p95 / error rate).
        </Text>
      </div>

      {cascade?.cascade_active && (
        <div className="mb-4 rounded-md border border-ui-border-error p-3">
          <Heading level="h3">Zero-opt-in cascade ACTIVE</Heading>
          <Text>Current step: {cascade.current_step}</Text>
          <Text>Action: {cascade.recommended_action}</Text>
          <a className="text-ui-fg-interactive underline" href={cascade.remediation_url}>
            Open remediation
          </a>
        </div>
      )}

      {data && (
        <div className="overflow-x-auto rounded-md border border-ui-border-base">
          <table className="min-w-full text-sm">
            <thead className="bg-ui-bg-subtle">
              <tr>
                <th className="px-3 py-2 text-left">Cohort</th>
                {KPIS.map((k) => (
                  <th key={k} className="px-3 py-2 text-left">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORTS.map((c) => (
                <tr key={c} className="border-t border-ui-border-base">
                  <td className="px-3 py-2 font-medium">{c}</td>
                  {KPIS.map((k) => {
                    const m = data.cohorts[c][k]
                    return (
                      <td key={k} className="px-3 py-2">
                        <Badge color={statusColor(m.status)}>
                          {m.value ?? "—"}
                        </Badge>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          n={m.sample_size}; {m.threshold}
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
    </Container>
  )
}
