import { Button, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export function RemediationStepCard({
  action,
  remediationUrl,
}: {
  action: string
  remediationUrl: string
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-3">
      <Text size="small" weight="plus">
        {t("operator.zero_opt_in_cascade.recommended_action")}
      </Text>
      <Text className="mt-1 text-ui-fg-subtle">{action}</Text>
      <Button variant="secondary" className="mt-3" asChild>
        <a href={remediationUrl}>{t("operator.zero_opt_in_cascade.open_remediation")}</a>
      </Button>
    </div>
  )
}