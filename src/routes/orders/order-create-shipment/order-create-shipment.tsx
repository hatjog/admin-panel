import { useParams } from "react-router-dom"

import { useOrder } from "@/hooks/api/orders"
import { OrderCreateShipmentForm } from "./components/order-create-shipment-form"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteFocusModal } from "@components/modals"

export function OrderCreateShipment() {
  const { id, f_id } = useParams()
  const { t } = useTranslation()

  const { order, isLoading, isError, error } = useOrder(id!, {
    fields: "*fulfillments,*fulfillments.items,*fulfillments.labels",
  })

  if (isError) {
    throw error
  }

  const ready = !isLoading && order
  const fulfillment = order?.fulfillments.find((f) => f.id === f_id)

  if (!fulfillment) {
    toast.error(t("orders.shipment.toastFulfillmentNotFound"))
    throw new Error("Fulfillment not found")
  }

  return (
    <RouteFocusModal>
      {ready && (
        <OrderCreateShipmentForm
          order={order}
          fulfillment={fulfillment}
        />
      )}
    </RouteFocusModal>
  )
}
