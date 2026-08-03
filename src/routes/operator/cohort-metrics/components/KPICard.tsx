import { Badge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type KPIMeasurement = {
  value: number | null
  sample_size: number
  threshold: string
  status: "green" | "yellow" | "red" | "unknown"
}

function statusColor(status: KPIMeasurement["status"]): "green" | "orange" | "red" | "blue" {
  return status === "green"
    ? "green"
    : status === "yellow"
      ? "orange"
      : status === "red"
        ? "red"
        : "blue"
}

export type { KPIMeasurement }

export function KPICard({ measurement }: { measurement: KPIMeasurement }): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="rounded-md border border-ui-border-base p-2">
      <Badge color={statusColor(measurement.status)}>{measurement.value ?? "—"}</Badge>
      <Text size="xsmall" className="mt-1 text-ui-fg-muted">
        {t("operator.cohort_metrics.sample_size_label")}={measurement.sample_size}; {measurement.threshold}
      </Text>
    </div>
  )
}