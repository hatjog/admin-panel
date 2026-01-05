import type { ExtendedAdminOrderLineItem } from "@custom-types/order"

export const getFulfillableQuantity = (item: ExtendedAdminOrderLineItem) => {
  return item.quantity - item.detail.fulfilled_quantity
}
