/**
 * Story v160-7-2: Nudge cadence admin dashboard.
 *
 * Mirrors Story 7.1 T-30 page architecture:
 *   - useQuery dashboard fetch from GET /admin/vendors/notifications/nudges/dashboard
 *   - useMutation per cadence step (POST /admin/vendors/notifications/nudges)
 *   - Force-decision modal as last-resort admin override (manual mark
 *     opted_in / opted_out for unreachable vendors).
 *
 * Dashboard chart: Path C — Medusa UI primitives only (cards + numbers + bars
 * via Tailwind / inline styles); no chart.js dependency. Funnel = horizontal
 * stacked bars per cadence step. Keeps minimal-viable bar low so widget ships
 * with story even when telemetry data is sparse pre-Phase B.
 */

import { useRef, useState } from 'react';

import { mercurAdminClient } from '@lib/mercur-admin-client';
import { Badge, Button, Container, Heading, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type CadenceStep = 't21' | 't14' | 't7' | 't3';

const STEPS: ReadonlyArray<CadenceStep> = ['t21', 't14', 't7', 't3'];

const STEP_LABELS: Record<CadenceStep, string> = {
  t21: 'T-21 (3 weeks)',
  t14: 'T-14 (2 weeks)',
  t7: 'T-7 (1 week)',
  t3: 'T-3 (final)'
};

type DashboardResponse = {
  per_step_counts: Record<CadenceStep, number>;
  decision_completion: {
    opted_in: number;
    opted_out: number;
    open: number;
    completion_rate: number;
  };
  pending_decisions: {
    count: number;
    days_to_flag_flip: number | null;
  };
  recent_dispatches: Array<{
    id: string;
    vendor_id: string;
    vendor_handle: string | null;
    notification_type: string;
    sent_at: string;
    locale: 'pl' | 'en';
    status: 'sent' | 'failed';
  }>;
};

type TriggerResponse = {
  step: CadenceStep;
  triggered: number;
  skipped: number;
  failed: number;
  audit_log_ids: string[];
};

type DecisionType = 'opted_in' | 'opted_out';

type ForceDecisionResponse = {
  vendor_id: string;
  decision: DecisionType;
  audit_log_id: string;
  email_dispatched: boolean;
};

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function generateUuidV4(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  const buf = new Uint8Array(16);
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 16; i++) buf[i] = (Math.random() * 256) | 0;
  }
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function NudgesDashboardPage() {
  const qc = useQueryClient();
  const [activeStep, setActiveStep] = useState<CadenceStep | null>(null);
  const [forceDecisionVendor, setForceDecisionVendor] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>('');

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardResponse>({
    queryKey: ['admin-vendors-nudges-dashboard'],
    queryFn: () => mercurAdminClient.vendors.notifications.nudges.dashboard<DashboardResponse>(),
    staleTime: 30_000
  });

  const triggerMutation = useMutation<TriggerResponse, Error, CadenceStep>({
    mutationFn: step =>
      mercurAdminClient.vendors.notifications.nudges.trigger<TriggerResponse>({
        step,
        dry_run: false
      }),
    onSuccess: res => {
      toast.success(
        `${STEP_LABELS[res.step]} dispatch: ${res.triggered} sent, ${res.skipped} skipped, ${res.failed} failed`
      );
      qc.invalidateQueries({ queryKey: ['admin-vendors-nudges-dashboard'] });
      setActiveStep(null);
    },
    onError: () => {
      toast.error('Nudge dispatch failed');
      setActiveStep(null);
    }
  });

  const dryRunMutation = useMutation<TriggerResponse, Error, CadenceStep>({
    mutationFn: step =>
      mercurAdminClient.vendors.notifications.nudges.trigger<TriggerResponse>({
        step,
        dry_run: true
      }),
    onSuccess: res => {
      toast.success(`${STEP_LABELS[res.step]} dry-run: ${res.triggered} eligible`);
    },
    onError: () => toast.error('Dry-run failed')
  });

  const forceDecisionMutation = useMutation<ForceDecisionResponse, Error, DecisionType>({
    mutationFn: decision => {
      const vendorId = forceDecisionVendor?.trim() ?? '';
      if (!vendorId) {
        throw new Error('Vendor ID is required');
      }
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateUuidV4();
      }
      return mercurAdminClient.vendors.decisions.capture<ForceDecisionResponse>(
        vendorId,
        {
          decision,
          reason: 'Admin force-decision from nudge dashboard',
          admin_note: 'Forced from nudge dashboard after unreachable-vendor escalation.'
        },
        idempotencyKeyRef.current
      );
    },
    onSuccess: data => {
      toast.success(`Decision captured: ${data.decision} (audit ${data.audit_log_id})`);
      void qc.invalidateQueries({ queryKey: ['admin-vendors-nudges-dashboard'] });
      void qc.invalidateQueries({ queryKey: ['admin-vendors-decisions'] });
      setForceDecisionVendor(null);
      idempotencyKeyRef.current = '';
    },
    onError: err => {
      // Reset idempotency key so a subsequent decision attempt with a different
      // payload does not reuse the key that was already sent (avoids 422
      // IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD from the backend).
      idempotencyKeyRef.current = '';
      toast.error(`Force-decision failed: ${err.message}`);
    }
  });

  const counts = dashboard?.per_step_counts ?? { t21: 0, t14: 0, t7: 0, t3: 0 };
  const completion = dashboard?.decision_completion;
  const pending = dashboard?.pending_decisions;
  const dispatches = dashboard?.recent_dispatches ?? [];
  const maxCount = Math.max(1, ...STEPS.map(s => counts[s]));

  return (
    <div className="flex flex-col gap-6 p-6">
      <Container>
        <div className="px-6 py-4">
          <Heading level="h1">Nudge Cadence Dashboard</Heading>
          <Text className="mt-1 text-ui-fg-subtle">
            Escalating reminder emails (T-21 → T-14 → T-7 → T-3) for vendors who have not yet picked
            opt-in / opt-out. Audit log dedup — already-notified vendors at the current step are
            skipped.
          </Text>
        </div>

        <div className="px-6 pb-4">
          {dashboardLoading && <Text>Loading dashboard…</Text>}
          {dashboard && (
            <div className="flex flex-col gap-2">
              <Text>
                <strong>Days to flag flip:</strong> {pending?.days_to_flag_flip ?? '—'}
              </Text>
              <Text>
                <strong>Completion rate:</strong>{' '}
                {completion ? `${(completion.completion_rate * 100).toFixed(0)}%` : '—'} (
                {completion?.opted_in ?? 0} opt-in / {completion?.opted_out ?? 0} opt-out /{' '}
                {completion?.open ?? 0} open)
              </Text>
            </div>
          )}
        </div>
      </Container>

      <Container>
        <div className="px-6 py-4">
          <Heading level="h2">Cadence funnel</Heading>
        </div>
        <div className="flex flex-col gap-3 px-6 pb-4">
          {STEPS.map(step => {
            const count = counts[step];
            const widthPct = (count / maxCount) * 100;
            return (
              <div
                key={step}
                className="flex flex-col gap-1"
                data-testid={`nudge-funnel-${step}`}
              >
                <div className="flex items-center justify-between">
                  <Text className="font-medium">{STEP_LABELS[step]}</Text>
                  <div className="flex items-center gap-2">
                    <Text className="text-xs text-ui-fg-subtle">{count} sent</Text>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => dryRunMutation.mutate(step)}
                      disabled={dryRunMutation.isPending}
                      data-testid={`nudge-dry-run-${step}`}
                    >
                      Dry-run
                    </Button>
                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => setActiveStep(step)}
                      data-testid={`nudge-send-${step}`}
                    >
                      Send
                    </Button>
                  </div>
                </div>
                <div
                  className="h-3 w-full rounded-sm border bg-ui-bg-base"
                  aria-label={`${STEP_LABELS[step]} progress`}
                >
                  <div
                    className="h-full rounded-sm bg-ui-tag-blue-bg"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {activeStep && (
          <div className="mx-6 mb-4 rounded border border-ui-border-base bg-ui-bg-subtle p-4">
            <Heading level="h3">Confirm {STEP_LABELS[activeStep]} dispatch</Heading>
            <Text className="mt-2">
              About to dispatch nudge {STEP_LABELS[activeStep]} to all eligible vendors.
              Already-notified at this step are skipped via audit log dedup. Action is irreversible.
            </Text>
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                size="small"
                onClick={() => triggerMutation.mutate(activeStep)}
                disabled={triggerMutation.isPending}
                data-testid={`nudge-confirm-${activeStep}`}
              >
                {triggerMutation.isPending ? 'Sending…' : 'Confirm + send'}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setActiveStep(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Container>

      <Container>
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Recent dispatches</Heading>
          <Badge
            color="grey"
            size="xsmall"
          >
            {dispatches.length} entries
          </Badge>
        </div>
        <div className="px-6 pb-4">
          {dispatches.length === 0 ? (
            <Text className="text-ui-fg-subtle">No nudges dispatched yet.</Text>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ui-border-strong text-xs uppercase tracking-wide text-ui-fg-subtle">
                    <th className="px-3 py-2">Sent at</th>
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Step</th>
                    <th className="px-3 py-2">Locale</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map(e => (
                    <tr
                      key={e.id}
                      className="border-b border-ui-border-base text-sm"
                    >
                      <td className="px-3 py-2">{formatShortDate(e.sent_at)}</td>
                      <td className="px-3 py-2">{e.vendor_handle ?? e.vendor_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.notification_type}</td>
                      <td className="px-3 py-2 uppercase">{e.locale}</td>
                      <td className="px-3 py-2">
                        <Badge
                          color={e.status === 'sent' ? 'green' : 'red'}
                          size="xsmall"
                        >
                          {e.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>

      <Container>
        <div className="px-6 py-4">
          <Heading level="h2">Force-decision (admin override)</Heading>
          <Text className="mt-1 text-ui-fg-subtle">
            Last-resort admin intervention for unreachable vendors. Marks decision_status without
            sending email; writes audit entry `admin_force_decision`. Vendor self-service opt-in
            form remains the primary path (Story 7.2.1).
          </Text>
        </div>
        <div className="px-6 pb-4">
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              idempotencyKeyRef.current = '';
              setForceDecisionVendor('');
            }}
            data-testid="nudge-force-decision-open"
          >
            Open force-decision modal
          </Button>
          {forceDecisionVendor !== null && (
            <div className="mt-3 rounded border border-ui-border-base bg-ui-bg-subtle p-4">
              <Heading level="h3">Force decision for vendor</Heading>
              <Text className="mt-2">
                Action persists `decision_status` directly + audit log entry with current admin
                actor id. Vendor receives no email.
              </Text>
              <input
                type="text"
                value={forceDecisionVendor}
                onChange={e => setForceDecisionVendor(e.target.value)}
                placeholder="vendor_id (uuid)"
                data-testid="nudge-force-decision-vendor-id"
                className="mt-3 w-full rounded border px-2 py-1 font-mono text-xs"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => forceDecisionMutation.mutate('opted_in')}
                  disabled={
                    forceDecisionMutation.isPending || forceDecisionVendor.trim().length === 0
                  }
                  data-testid="nudge-force-decision-confirm-optin"
                >
                  {forceDecisionMutation.isPending ? 'Saving…' : 'Mark opt-in'}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => forceDecisionMutation.mutate('opted_out')}
                  disabled={
                    forceDecisionMutation.isPending || forceDecisionVendor.trim().length === 0
                  }
                  data-testid="nudge-force-decision-confirm-optout"
                >
                  {forceDecisionMutation.isPending ? 'Saving…' : 'Mark opt-out'}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setForceDecisionVendor(null);
                    idempotencyKeyRef.current = '';
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
