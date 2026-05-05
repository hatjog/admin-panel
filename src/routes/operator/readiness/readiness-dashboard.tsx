/**
 * Story v160-8-1: Pre-flag-flip readiness dashboard.
 * 6-item grid + GoNoGoBadge + remediation links.
 */

import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "@lib/client"

type ReadinessStatus = "green" | "yellow" | "red" | "unknown"

type ReadinessItem = {
  key: string
  label: string
  status: ReadinessStatus
  value: string
  threshold: string
  remediation_url: string
}

type ReadinessResult = {
  items: ReadinessItem[]
  overall: "green" | "yellow" | "red"
  computed_at: string
}

function badgeColor(s: ReadinessStatus): "green" | "orange" | "red" | "blue" {
  switch (s) {
    case "green":
      return "green"
    case "yellow":
      return "orange"
    case "red":
      return "red"
    default:
      return "blue"
  }
}

export function ReadinessDashboardPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useQuery<ReadinessResult>({
    queryKey: ["admin-operator-readiness"],
    queryFn: () => sdk.client.fetch("/admin/operator/readiness"),
    staleTime: 30_000,
  })

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">{t("operator.readiness.title")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("operator.readiness.subtitle")}
          </Text>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          {t("operator.readiness.refresh")}
        </Button>
      </div>

      {isLoading && <Text>{t("labels.loading")}</Text>}

      {isError && (
        <div className="mb-4 rounded-md border border-ui-border-error bg-ui-bg-error p-4">
          <Text>{t("operator.readiness.error")}</Text>
        </div>
      )}

      {!isLoading && !data && !isError && <Text>{t("operator.readiness.empty")}</Text>}

      {data && (
        <>
          <div className="mb-6 rounded-md border border-ui-border-base p-4">
            <Badge color={badgeColor(data.overall)}>
              {t(`operator.readiness.overall_${data.overall}`)}
            </Badge>
            <Text className="ml-3 inline">
              {t("operator.readiness.last_computed")}: {new Date(data.computed_at).toLocaleString()}
            </Text>
            <Text className="mt-2 block text-ui-fg-subtle" size="small">
              {t(`operator.readiness.reason_${data.overall}`)}
            </Text>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.items.map((it) => (
              <div
                key={it.key}
                className="rounded-md border border-ui-border-base p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Text weight="plus">{t(`operator.readiness.${it.key}`)}</Text>
                  <Badge color={badgeColor(it.status)}>{it.status.toUpperCase()}</Badge>
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  {it.value}
                </Text>
                <Text size="xsmall" className="mt-1 text-ui-fg-muted">
                  {t("operator.readiness.threshold_label")}: {it.threshold}
                </Text>
                <a
                  className="mt-2 inline-block text-ui-fg-interactive underline"
                  href={it.remediation_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("operator.readiness.remediate")}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </Container>
  )
}
