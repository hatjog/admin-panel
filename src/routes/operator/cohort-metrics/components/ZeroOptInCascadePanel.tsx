import { Badge, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { RemediationStepCard } from "./RemediationStepCard"

type Cascade = {
  opted_in_count: number
  cascade_active: boolean
  current_step: string
  recommended_action: string
  remediation_url: string
}

const CASCADE_STEPS = [
  "retrigger_t30",
  "escalate",
  "suspend",
  "rollback_to_shadow",
] as const

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

export function ZeroOptInCascadePanel({ cascade }: { cascade: Cascade }): React.JSX.Element {
  const { t } = useTranslation()

  if (!cascade.cascade_active) {
    return <></>
  }

  return (
    <div className="mb-4 rounded-md border border-ui-border-error p-4">
      <Heading level="h2" className="mb-2 text-base">
        {t("operator.zero_opt_in_cascade.title")} {t("operator.zero_opt_in_cascade.active")}
      </Heading>
      <Text className="mb-3 text-ui-fg-subtle">
        {t("operator.zero_opt_in_cascade.current_step_label")}: {" "}
        {t(getCascadeStepKey(cascade.current_step), {
          defaultValue: cascade.current_step,
        })}
      </Text>
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        {CASCADE_STEPS.map((step) => {
          const active = step === cascade.current_step
          return (
            <div key={step} className="rounded-md border border-ui-border-base bg-ui-bg-base p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Text size="small" weight="plus">
                  {t(getCascadeStepKey(step))}
                </Text>
                <Badge color={active ? "red" : "blue"}>{active ? "NOW" : "WAIT"}</Badge>
              </div>
            </div>
          )
        })}
      </div>
      <RemediationStepCard
        action={cascade.recommended_action}
        remediationUrl={cascade.remediation_url}
      />
    </div>
  )
}