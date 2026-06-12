/**
 * Story v160-7-5: JCA management list page (admin-panel).
 */

import { useState } from 'react';

import { mercurAdminClient } from '@lib/mercur-admin-client';
import { Badge, Button, Container, Heading, Input, Select, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';

type JCAStatus = 'not_generated' | 'generated' | 'signed';

type JCAVendor = {
  id: string;
  handle: string;
  opted_in_date: string | null;
  jca_status: JCAStatus;
};

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
    opted_in_date: vendor.last_action_at,
    jca_status: 'not_generated'
  };
}

export function VendorJCAListPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<JCAStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data, error, isLoading } = useQuery<JCAListResponse>({
    queryKey: ['admin-vendors-jca-list', search],
    queryFn: () =>
      mercurAdminClient.vendors.jca.list<JCAListResponse>({
        status: 'opted_in',
        search: search.trim() || undefined,
        limit: 100
      }),
    staleTime: 30_000
  });

  const vendors = (data?.vendors ?? [])
    .flatMap(vendor => {
      const jcaVendor = mapToJcaVendor(vendor);
      return jcaVendor ? [jcaVendor] : [];
    })
    .filter(v => {
      if (statusFilter !== 'all' && v.jca_status !== statusFilter) return false;
      return true;
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
        <Select
          value={statusFilter}
          onValueChange={v => setStatusFilter(v as JCAStatus | 'all')}
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="All statuses" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="not_generated">Not generated</Select.Item>
            <Select.Item value="generated">Generated</Select.Item>
            <Select.Item value="signed">Signed</Select.Item>
          </Select.Content>
        </Select>

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
                <th className="px-3 py-2 text-left">JCA status</th>
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
                    <Badge color={v.jca_status === 'signed' ? 'green' : 'blue'}>
                      {v.jca_status}
                    </Badge>
                  </td>
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
