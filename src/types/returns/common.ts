import type { HttpTypes } from "@medusajs/types"

export interface ExtendedAdminReturnItem extends HttpTypes.AdminReturnItem {
  reason?: {
    id: string
    label: string
    value: string
  }
}

export interface ExtendedAdminReturn extends Omit<HttpTypes.AdminReturn, "items"> {
  items?: ExtendedAdminReturnItem[]
  requested_at?: string | null
}

export interface ExtendedAdminReturnsResponse {
  returns: ExtendedAdminReturn[]
  count: number
  offset: number
  limit: number
}

export interface ExtendedAdminReturnResponse {
  return: ExtendedAdminReturn
}

