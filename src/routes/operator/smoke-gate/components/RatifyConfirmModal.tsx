import { Button, Input, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export function RatifyConfirmModal({
  adminNote,
  isPending,
  onAdminNoteChange,
  onPass,
  onFail,
  onCancel,
}: {
  adminNote: string
  isPending: boolean
  onAdminNoteChange: (value: string) => void
  onPass: () => void
  onFail: () => void
  onCancel: () => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="mt-3 rounded-md border border-ui-border-base p-3">
      <Text className="mb-2" weight="plus">
        {t("operator.smoke_gate.confirm_modal_title")}
      </Text>
      <Text className="mb-3 text-ui-fg-subtle">
        {t("operator.smoke_gate.confirm_modal_message")}
      </Text>
      <Input
        placeholder={t("operator.smoke_gate.admin_note_required")}
        value={adminNote}
        onChange={(event) => onAdminNoteChange(event.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <Button onClick={onPass} disabled={isPending}>
          {t("operator.smoke_gate.ratify_pass")}
        </Button>
        <Button variant="secondary" onClick={onFail} disabled={isPending}>
          {t("operator.smoke_gate.ratify_fail")}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t("operator.smoke_gate.cancel")}
        </Button>
      </div>
    </div>
  )
}