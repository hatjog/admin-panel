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

type RequestOptions<TBody extends FetchArgs['body'] = never> = Omit<FetchArgs, 'body'> & {
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
) => sdk.client.fetch<TResponse>(path, options);

const requestAdminGet = <TResponse>(path: string, query?: AdminQuery) =>
  requestAdmin<TResponse>(path, {
    method: 'GET',
    query
  });

type OperatorFlagState = 'off' | 'shadow' | 'on';
type VendorLifecycleStatus = 'pending_approval' | 'open' | 'suspended' | 'terminated';

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
  operator: {
    alerting: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/alerting'),
      evaluate: <TResponse = unknown>() =>
        requestAdmin<TResponse>('/admin/operator/alerting', {
          method: 'POST'
        })
    },
    cohortMetrics: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/cohort-metrics'),
      zeroOptInCascade: <TResponse>() =>
        requestAdminGet<TResponse>('/admin/operator/zero-opt-in-cascade')
    },
    consents: {
      list: <TResponse>(query?: AdminQuery) =>
        requestAdminGet<TResponse>('/admin/operator/consents', query)
    },
    flagFlip: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/flag-flip'),
      transition: <TResponse = unknown>(body: {
        to_state: OperatorFlagState;
        admin_note?: string;
      }) =>
        requestAdmin<TResponse, typeof body>('/admin/operator/flag-flip', {
          method: 'POST',
          body
        })
    },
    kickoff: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/kickoff'),
      trigger: <TResponse = unknown>(body: { confirm: true; admin_note?: string }) =>
        requestAdmin<TResponse, typeof body>('/admin/operator/kickoff', {
          method: 'POST',
          body
        })
    },
    readiness: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/readiness')
    },
    securityGates: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/security-gates'),
      run: <TResponse = unknown>(body?: { gate?: string }) =>
        requestAdmin<TResponse, { gate?: string }>('/admin/operator/security-gates', {
          method: 'POST',
          ...(body ? { body } : {})
        })
    },
    smokeGate: {
      status: <TResponse>() => requestAdminGet<TResponse>('/admin/operator/smoke-gate-status'),
      ratify: <TResponse = unknown>(body: { verdict: 'pass' | 'fail'; admin_note?: string }) =>
        requestAdmin<TResponse, typeof body>('/admin/operator/smoke-gate-ratify', {
          method: 'POST',
          body
        })
    }
  },
  vendors: {
    decisions: {
      list: <TResponse>(query?: AdminQuery) =>
        requestAdminGet<TResponse>('/admin/vendors/decisions', query),
      capture: <TResponse>(
        vendorId: string,
        body: {
          decision: 'opted_in' | 'opted_out' | '';
          reason: string;
          admin_note?: string;
        },
        idempotencyKey: string
      ) =>
        requestAdmin<TResponse, typeof body>(`/admin/vendors/${vendorId}/decision`, {
          method: 'POST',
          headers: {
            'Idempotency-Key': idempotencyKey
          },
          body
        })
    },
    jca: {
      generate: <TResponse>(vendorId: string, body: { locale: 'pl' | 'en' }) =>
        requestAdmin<TResponse, typeof body>(`/admin/vendors/${vendorId}/jca/generate`, {
          method: 'POST',
          body
        }),
      download: (vendorId: string, body: { locale: 'pl' | 'en' }) =>
        requestAdmin<Blob, typeof body>(`/admin/vendors/${vendorId}/jca/generate?download=1`, {
          method: 'POST',
          headers: { Accept: 'application/pdf' },
          body
        }),
      sign: <TResponse>(vendorId: string, body: { admin_note?: string }) =>
        requestAdmin<TResponse, typeof body>(`/admin/vendors/${vendorId}/jca/sign`, {
          method: 'POST',
          body
        })
    },
    lifecycle: {
      transition: <TResponse>(
        vendorId: string,
        body: { to_status: VendorLifecycleStatus; admin_note?: string }
      ) =>
        requestAdmin<TResponse, typeof body>(`/admin/vendors/${vendorId}/lifecycle-status`, {
          method: 'POST',
          body
        })
    },
    notifications: {
      nudges: {
        dashboard: <TResponse>() =>
          requestAdminGet<TResponse>('/admin/vendors/notifications/nudges/dashboard'),
        trigger: <TResponse>(body: { step: 't21' | 't14' | 't7' | 't3'; dry_run: boolean }) =>
          requestAdmin<TResponse, typeof body>('/admin/vendors/notifications/nudges', {
            method: 'POST',
            body
          })
      },
      t30: {
        preview: <TResponse>() =>
          requestAdminGet<TResponse>('/admin/vendors/notifications/t30/preview'),
        audit: <TResponse>() =>
          requestAdminGet<TResponse>('/admin/vendors/notifications/t30/audit'),
        trigger: <TResponse>(body: { dry_run: boolean }) =>
          requestAdmin<TResponse, typeof body>('/admin/vendors/notifications/t30', {
            method: 'POST',
            body
          })
      }
    },
    pauseGate: {
      list: <TResponse>(query?: AdminQuery) =>
        requestAdminGet<TResponse>('/admin/vendors/pause-gate', query),
      retrieve: <TResponse>(vendorId: string) =>
        requestAdminGet<TResponse>(`/admin/vendors/${vendorId}/pause-gate`)
    },
    trainingCert: {
      review: <TResponse>(
        vendorId: string,
        body: { decision: 'approve' | 'reject'; admin_note?: string; rejection_reason?: string }
      ) =>
        requestAdmin<TResponse, typeof body>(`/admin/vendors/${vendorId}/training-cert`, {
          method: 'POST',
          body
        })
    }
  },
  v1Admin: {
    entitlements: {
      search: <TResponse>(q: string) => requestAdminGet<TResponse>('/v1/admin/entitlements', { q })
    },
    health: {
      retrieve: <TResponse>() => requestAdminGet<TResponse>('/v1/admin/health')
    },
    vendors: {
      list: <TResponse>() => requestAdminGet<TResponse>('/v1/admin/vendors'),
      create: <TResponse = unknown>(body: {
        name: string;
        instance_id: string;
        market_id: string;
      }) =>
        requestAdmin<TResponse, typeof body>('/v1/admin/vendors', {
          method: 'POST',
          body
        })
    }
  },
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
