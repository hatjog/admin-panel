import { useSearchParams } from "react-router-dom"

import { RouteFocusModal } from "../../../components/modals"
import { ReservationCreateForm } from "./components/reservation-create-from"
import { useTranslation } from "react-i18next"

export const ReservationCreate = () => {
  const [params] = useSearchParams()
  const { t } = useTranslation()

  const inventoryItemId = params.get("item_id")
  
  if (!inventoryItemId) {
    throw new Error(t("inventory.reservation.errors.idRequired"))
  }

  return (
    <RouteFocusModal>
      <ReservationCreateForm inventoryItemId={inventoryItemId} />
    </RouteFocusModal>
  )
}
