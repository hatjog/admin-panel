import type { HttpTypes } from "@medusajs/types"
import type { BaseClaimItem } from "@medusajs/types/dist/http/claim/common"

export interface ExtendedBaseClaimItem extends BaseClaimItem {
  item?: {
    id: string
    title?: string
    thumbnail?: string | null
    variant_title?: string
    product_title?: string
  }
}

export interface ExtendedAdminClaim extends Omit<HttpTypes.AdminClaim, "additional_items"> {
  additional_items?: ExtendedBaseClaimItem[]
}

export interface ExtendedAdminClaimListResponse {
  claims: ExtendedAdminClaim[]
  count: number
  offset: number
  limit: number
}
export interface ExtendedAdminClaimResponse {
  claim: ExtendedAdminClaim
}

export interface AdminAddClaimOutboundItemsPayload {
  items: {
    variant_id: string
    quantity: number
    reason?: string
    description?: string
    internal_note?: string
  }[]
}
