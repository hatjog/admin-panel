import type { FetchArgs } from '@medusajs/js-sdk';
import type { AdminCustomerGroup, AdminOrder, AdminProduct, HttpTypes } from '@medusajs/types';
import type { FileType as MercurAdminFileType } from '@mercurjs/admin';

import { sdk } from '@/lib/client';
import type { AttributeDTO, VendorSeller } from '@/types';
import type { OrderGroup } from '@/types/order/common';

export type MercurAdminPackageMarker = Pick<MercurAdminFileType, 'id'>;

type AdminQueryValue = string | number | boolean | string[] | number[] | undefined;

type AdminQuery = Record<string, AdminQueryValue>;
type SellerUpdatePayload = Record<string, unknown>;
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
 * Golden-PR singleton for Story 8.1/FR-Ga.1 typed admin migrations.
 *
 * `@mercurjs/admin@2.1.1` is the pinned Mercur admin package, while this panel's
 * authenticated transport already lives in the Medusa SDK instance. Keep cookie
 * and bearer behavior centralized by reusing `sdk.client.fetch`, and add typed
 * endpoint methods here for Story 8.2 replication instead of per-callsite fetches.
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
