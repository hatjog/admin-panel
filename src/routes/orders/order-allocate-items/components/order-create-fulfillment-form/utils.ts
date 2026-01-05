import type { ExtendedAdminOrderLineItem } from "@custom-types/order"
import type { ExtendedAdminProductVariantInventoryItemLink } from "@custom-types/product"

export function checkInventoryKit(
  item: ExtendedAdminOrderLineItem
) {
  const variant = item.variant

  if (!variant) {
    return false
  }

  return (
    (!!variant.inventory_items?.length && variant.inventory_items?.length > 1) ||
    (variant.inventory_items?.length === 1 &&
      variant.inventory_items[0].required_quantity! > 1)
  )
}

export function getFirstInventoryId(
  item: ExtendedAdminOrderLineItem
): string | undefined {
  return item.variant?.inventory?.[0]?.id
}

export function getFirstInventoryItem(
  item: ExtendedAdminOrderLineItem
) {
  return item.variant?.inventory?.[0]
}

export function getRequiredQuantity(
  variant: ExtendedAdminOrderLineItem["variant"],
  index: number
): number {
  return variant?.inventory_items?.[index]?.required_quantity ?? 0
}

export function getInventoryItems(
  variant: ExtendedAdminOrderLineItem["variant"]
): ExtendedAdminProductVariantInventoryItemLink[] {
  return variant?.inventory_items ?? []
}

export function getInventory(
  variant: ExtendedAdminOrderLineItem["variant"]
) {
  return variant?.inventory ?? []
}

export function getQuantityKey(
  itemId: string,
  inventoryId: string | undefined,
  hasInventoryKit: boolean
): string {
  if (hasInventoryKit) {
    return `${itemId}-`
  }
  if (!inventoryId) {
    return `${itemId}-`
  }

  return `${itemId}-${inventoryId}`
}

export function getQuantityValue(
  quantityField: Record<string, string | number>,
  key: string
): number | null {
  const value = quantityField[key]
  if (value === undefined || value === null || value === "") {
    return null
  }

  return typeof value === "string" ? Number(value) : value
}
