import { Badge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export function BinaryVerdictBadge({
  verdict,
}: {
  verdict: "pass" | "fail" | "pending"
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Badge color={verdict === "pass" ? "green" : verdict === "fail" ? "red" : "blue"}>
      {t("operator.smoke_gate.computed_label")}: {t(`operator.smoke_gate.verdict_${verdict}`)}
    </Badge>
  )
}