import { Badge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ItemEvidenceLink } from "./ItemEvidenceLink"

type ItemStatus = "pass" | "fail" | "unknown"

type Item = {
  key: string
  label: string
  nfr_ref: string
  status: ItemStatus
  evidence_url: string
}

function color(status: ItemStatus): "green" | "red" | "blue" {
  return status === "pass" ? "green" : status === "fail" ? "red" : "blue"
}

export function ChecklistTable({ items }: { items: Item[] }): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto rounded-md border border-ui-border-base">
      <table className="min-w-full text-sm">
        <thead className="bg-ui-bg-subtle">
          <tr>
            <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_item_label")}</th>
            <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_nfr_ref")}</th>
            <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_status")}</th>
            <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_evidence")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className="border-t border-ui-border-base">
              <td className="px-3 py-2">{item.label}</td>
              <td className="px-3 py-2">{item.nfr_ref}</td>
              <td className="px-3 py-2">
                <Badge color={color(item.status)}>
                  {t(`operator.smoke_gate.status_${item.status}`)}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <ItemEvidenceLink evidenceUrl={item.evidence_url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}