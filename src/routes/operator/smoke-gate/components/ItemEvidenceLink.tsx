import { useTranslation } from "react-i18next"

export function ItemEvidenceLink({ evidenceUrl }: { evidenceUrl: string }): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <a
      className="text-ui-fg-interactive underline"
      href={evidenceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {t("operator.smoke_gate.evidence_view")}
    </a>
  )
}