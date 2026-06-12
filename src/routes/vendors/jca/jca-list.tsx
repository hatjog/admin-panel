/**
 * Story v160-7-5: JCA management list page (admin-panel).
 *
 * HG-12 note: `jca_status` has no real backend source (jca-detail generates/signs
 * on-demand without persisting a status field). The status column and filter have
 * been removed to avoid presenting a dead filter as functional. When a real
 * `jca_status` field is persisted by the backend, restore the column + filter here.
 */

import { useDeferredValue, useState } from 'react';

import { mercurAdminClient } from '@lib/mercur-admin-client';
import { Button, Container, Heading, Input, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';

type VendorDecisionListEntry = {
  id: string;
  handle: string;
  email: string;
  lifecycle_status: string;
  decision_status: 'pending' | 'opted_in' | 'opted_out' | 'forced';
  last_action_at: string | null;
};

type JCAListResponse = {
  vendors: VendorDecisionListEntry[];
  total: number;
  page: number;
  limit: number;
};

type JCAVendor = {
  id: string;
  handle: string;
  opted_in_date: string | null;
};

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function mapToJcaVendor(vendor: VendorDecisionListEntry): JCAVendor | null {
  if (vendor.decision_status !== 'opted_in') {
    return null;
  }

  return {
    id: vendor.id,
    handle: vendor.handle,
    opted_in_date: vendor.last_action_at
  };
}

export function VendorJCAListPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  // Debounce search via useDeferredValue — avoids a new HTTP request on every keystroke.
  const deferredSearch = useDeferredValue(search);

  const { data, error, isLoading } = useQuery<JCAListResponse>({
    queryKey: ['admin-vendors-jca-list', deferredSearch],
    queryFn: () =>
      mercurAdminClient.vendors.decisions.list<JCAListResponse>({
        status: 'opted_in',
        search: deferredSearch.trim() || undefined,
        limit: 100
      }),
    staleTime: 30_000
  });

  const vendors = (data?.vendors ?? []).flatMap(vendor => {
    const jcaVendor = mapToJcaVendor(vendor);
    return jcaVendor ? [jcaVendor] : [];
  });

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">JCA Management</Heading>
        <Text className="text-ui-fg-subtle">
          Joint Controller Agreement — generation + dispatch + signature status.
        </Text>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Search vendor"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading && <Text>Loading…</Text>}

      {!isLoading && error && (
        <div className="rounded-md border border-ui-border-base p-6">
          <Text className="text-ui-fg-subtle">
            Unable to load JCA vendors: {(error as Error).message}
          </Text>
        </div>
      )}

      {!isLoading && !error && vendors.length === 0 ? (
        <div className="rounded-md border border-dashed border-ui-border-base p-8 text-center">
          <Text className="text-ui-fg-subtle">No vendors require JCA management.</Text>
        </div>
      ) : null}

      {!isLoading && !error && vendors.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ui-border-base">
          <table className="min-w-full text-sm">
            <thead className="bg-ui-bg-subtle">
              <tr>
                <th className="px-3 py-2 text-left">Handle</th>
                <th className="px-3 py-2 text-left">Opted-in date</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr
                  key={v.id}
                  className="border-t border-ui-border-base"
                >
                  <td className="px-3 py-2 font-medium">{v.handle}</td>
                  <td className="px-3 py-2">{formatShortDate(v.opted_in_date)}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => {
                        window.location.href = `/app/vendors/jca/${v.id}`;
                      }}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
