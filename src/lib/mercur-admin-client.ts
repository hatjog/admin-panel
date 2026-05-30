import type { FetchArgs } from '@medusajs/js-sdk';
import type { AdminCustomerGroup, AdminOrder, AdminProduct, HttpTypes } from '@medusajs/types';

import { sdk } from '@/lib/client';
import type { AttributeDTO, VendorSeller } from '@/types';
import type { OrderGroup } from '@/types/order/common';

/**
 * Mercur-curated product detail query field set. Inlined locally as a trivial
 * string constant (mirrors `@mercurjs/admin`'s `PRODUCT_DETAIL_FIELDS` value)
 * rather than imported, so the dual-SDK boundary stays transport-layer-only:
 * Medusa's `@medusajs/js-sdk` `sdk.client.fetch` owns auth/transport, and we do
 * not pull `@mercurjs/admin` in at value level just to alias a constant.
 */
export const MERCUR_PRODUCT_DETAIL_FIELDS =
  '*seller,*categories,*shipping_profile,-variants' as const;
export const MERCUR_PRODUCT_DETAIL_QUERY = {
  fields: MERCUR_PRODUCT_DETAIL_FIELDS
} as const;

type AdminQueryValue = string | number | boolean | string[] | number[] | undefined;

type AdminQuery = Record<string, AdminQueryValue>;
export type SellerUpdatePayload = Partial<VendorSeller>;
type SellerInvitePayload = {
  email: string;
  registration_url?: string;
};

type RequestOptions<TBody extends FetchArgs['body'] = never> = {
  method: 'GET' | 'POST' | 'DELETE';
  query?: AdminQuery;
  body?: TBody;
};

type SellersResponse = {
  sellers: VendorSeller[];
  count?: number;
};

type SellerResponse = {
  seller: VendorSeller;
};

type SellerOrdersResponse = {
  orders: AdminOrder[];
};

type SellerProductsResponse = {
  products: AdminProduct[];
};

type SellerCustomerGroupsResponse = {
  customer_groups: AdminCustomerGroup[];
};

type SellerInviteResponse = {
  invite?: unknown;
};

type OrderGroupsResponse = {
  order_groups: OrderGroup[];
};

type ProductAttributesResponse = {
  attributes: AttributeDTO[];
};

const requestAdmin = <TResponse, TBody extends FetchArgs['body'] = never>(
  path: string,
  options: RequestOptions<TBody>
) =>
  sdk.client.fetch<TResponse>(path, options);

/**
 * Golden-PR singleton for Story 8.1 / FR-Ga.1 typed admin migrations (D-118 Path B).
 *
 * Dual-SDK boundary (intentional and honest):
 *  - Transport / auth: `@medusajs/js-sdk` `sdk.client.fetch` reused so admin-session
 *    cookies + JWT bearer behavior stay centralized (no second auth path). This is
 *    the genuine D-118 strategy — the boundary lives at the transport layer only.
 *  - Mercur surface: Mercur-specific query shapes (e.g.
 *    {@link MERCUR_PRODUCT_DETAIL_QUERY}, {@link MERCUR_PRODUCT_DETAIL_FIELDS}) are
 *    inlined locally as trivial string constants instead of imported from
 *    `@mercurjs/admin` at value level; response/payload aliases below re-use
 *    `@medusajs/types` for endpoints whose contract Medusa still owns.
 *
 * Replication (Story 8.2 / 8.3): add endpoint methods here first, then swap
 * callsites — do not branch per-callsite `new MercurAdmin(...)`. Codegen path
 * (Story 8.4 drift validator + potential `pnpm run generate:mercur-admin` from
 * Mercur OpenAPI) is the proposed long-term replacement for hand-typed response
 * aliases once the Path B migration completes.
 */
export const mercurAdminClient = {
  sellers: {
    list: (query?: AdminQuery) =>
      requestAdmin<SellersResponse>('/admin/sellers', {
        method: 'GET',
        query
      }),
    retrieve: (id: string, query?: AdminQuery) =>
      requestAdmin<SellerResponse>(`/admin/sellers/${id}`, {
        method: 'GET',
        query
      }),
    listOrders: (id: string, query?: AdminQuery) =>
      requestAdmin<SellerOrdersResponse>(`/admin/sellers/${id}/orders`, {
        method: 'GET',
        query
      }),
    update: (id: string, body: SellerUpdatePayload) =>
      requestAdmin<SellerResponse, SellerUpdatePayload>(`/admin/sellers/${id}`, {
        method: 'POST',
        body
      }),
    listProducts: (id: string, query?: AdminQuery) =>
      requestAdmin<SellerProductsResponse>(`/admin/sellers/${id}/products`, {
        method: 'GET',
        query
      }),
    listCustomerGroups: (id: string, query?: AdminQuery) =>
      requestAdmin<SellerCustomerGroupsResponse>(`/admin/sellers/${id}/customer-groups`, {
        method: 'GET',
        query
      }),
    invite: (body: SellerInvitePayload) =>
      requestAdmin<SellerInviteResponse, SellerInvitePayload>('/admin/sellers/invite', {
        method: 'POST',
        body
      })
  },
  orderGroups: {
    listByOrder: (orderId: string) =>
      requestAdmin<OrderGroupsResponse>('/admin/order-groups', {
        method: 'GET',
        query: { order_id: orderId }
      })
  },
  products: {
    listApplicableAttributes: (id: string) =>
      requestAdmin<ProductAttributesResponse>(`/admin/products/${id}/applicable-attributes`, {
        method: 'GET'
      }),
    delete: (id: string) =>
      requestAdmin<HttpTypes.AdminProductDeleteResponse>(`/admin/products/${id}`, {
        method: 'DELETE'
      })
  },
  customerGroups: {
    delete: (id: string) =>
      requestAdmin<HttpTypes.AdminCustomerGroupDeleteResponse>(`/admin/customer-groups/${id}`, {
        method: 'DELETE'
      })
  }
} as const;
