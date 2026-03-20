/**
 * Entitlements admin search page (Story 8.1 — "30-second test").
 *
 * Allows operators to find any entitlement in 30 seconds by:
 *   - buyer email (cross-DB join via backend)
 *   - claim_token, voucher_code, or order_id (direct gp_core lookup)
 *
 * AC-3: Full context in ONE view — no additional navigation required.
 * IP-5: Short date format "31.03.2026" for list display.
 *
 * References:
 * - architecture-v1.2.0.md#UX-DR13 — 30-second test UX requirement
 * - architecture-v1.2.0.md#DD-16 — admin search design decision
 */
import { useState, useCallback, useRef } from "react"
import {
  Badge,
  Container,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@lib/client"

// ─── Types ───────────────────────────────────────────────────────────────────

type RedemptionRecord = {
  id: string
  amount_minor: number
  vendor_id: string
  redeemed_at: string
  idempotency_key: string
}

type AuditLogEntry = {
  id: string
  action: string
  actor: string
  reason: string | null
  created_at: string
}

type EntitlementAdminView = {
  id: string
  status: string
  voucher_code: string
  claim_token: string
  order_id: string | null
  face_value_minor: number
  remaining_minor: number
  currency: string
  product_name: string
  vendor_name: string
  created_at: string
  expires_at: string | null
  claimed_at: string | null
  last_redeemed_at: string | null
  redemptions: RedemptionRecord[]
  audit_log: AuditLogEntry[]
}

type EntitlementsResponse = {
  data: { entitlements: EntitlementAdminView[] }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format minor currency amount (e.g. 10000 PLN minor → "100,00 PLN"). */
function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100)
}

/** Format ISO date to short Polish format "31.03.2026" (IP-5). */
function formatShortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—"

  const d = new Date(isoDate)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/** Map status to badge color. */
function statusColor(status: string): "green" | "red" | "orange" | "grey" {
  switch (status) {
    case "active":
    case "claimed":
      return "green"
    case "fully_redeemed":
      return "grey"
    case "expired":
    case "voided":
    case "refunded":
      return "red"
    default:
      return "orange"
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RedemptionHistoryList({ redemptions }: { redemptions: RedemptionRecord[] }) {
  if (!redemptions.length) {
    return <Text size="small" className="text-ui-fg-subtle">Brak realizacji.</Text>
  }

  return (
    <div className="mt-2 space-y-1">
      {redemptions.map((r) => (
        <div key={r.id} className="flex justify-between text-xs text-ui-fg-subtle border-b border-ui-border-base pb-1">
          <span>{formatShortDate(r.redeemed_at)}</span>
          <span className="font-mono">{formatAmount(r.amount_minor, "PLN")}</span>
          <span className="truncate max-w-[120px]" title={r.vendor_id}>
            vendor: {r.vendor_id.slice(0, 8)}…
          </span>
          <span className="truncate max-w-[120px]" title={r.idempotency_key}>
            idem: {r.idempotency_key.slice(0, 8)}…
          </span>
        </div>
      ))}
    </div>
  )
}

function AuditLogTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (!entries.length) {
    return <Text size="small" className="text-ui-fg-subtle">Brak wpisów audit log.</Text>
  }

  return (
    <div className="mt-2 space-y-1">
      {entries.map((e) => (
        <div key={e.id} className="flex gap-3 text-xs text-ui-fg-subtle border-l-2 border-ui-border-strong pl-2 pb-1">
          <span>{formatShortDate(e.created_at)}</span>
          <span className="font-semibold">{e.action}</span>
          <span>{e.actor}</span>
          {e.reason && <span className="text-ui-fg-muted">({e.reason})</span>}
        </div>
      ))}
    </div>
  )
}

function EntitlementCard({ entitlement }: { entitlement: EntitlementAdminView }) {
  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4 mb-4 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge color={statusColor(entitlement.status)} size="xsmall">
              {entitlement.status}
            </Badge>
            <Text weight="plus" size="small">{entitlement.product_name}</Text>
          </div>
          <Text size="xsmall" className="text-ui-fg-subtle">{entitlement.vendor_name}</Text>
        </div>
        <div className="text-right">
          <Text weight="plus" size="base">
            {formatAmount(entitlement.face_value_minor, entitlement.currency)}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            Pozostało: {formatAmount(entitlement.remaining_minor, entitlement.currency)}
          </Text>
        </div>
      </div>

      {/* Identifiers */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div>
          <span className="text-ui-fg-subtle">Voucher: </span>
          <span className="font-mono">{entitlement.voucher_code}</span>
        </div>
        <div>
          <span className="text-ui-fg-subtle">Claim token: </span>
          <span className="font-mono text-[10px]">{entitlement.claim_token}</span>
        </div>
        {entitlement.order_id && (
          <div>
            <span className="text-ui-fg-subtle">Order ID: </span>
            <span className="font-mono text-[10px]">{entitlement.order_id}</span>
          </div>
        )}
        <div>
          <span className="text-ui-fg-subtle">ID: </span>
          <span className="font-mono text-[10px]">{entitlement.id}</span>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-4 gap-2 text-xs mb-4">
        <div>
          <div className="text-ui-fg-subtle">Utworzono</div>
          <div>{formatShortDate(entitlement.created_at)}</div>
        </div>
        <div>
          <div className="text-ui-fg-subtle">Wygasa</div>
          <div>{formatShortDate(entitlement.expires_at)}</div>
        </div>
        <div>
          <div className="text-ui-fg-subtle">Aktywowano</div>
          <div>{formatShortDate(entitlement.claimed_at)}</div>
        </div>
        <div>
          <div className="text-ui-fg-subtle">Ostatnio użyto</div>
          <div>{formatShortDate(entitlement.last_redeemed_at)}</div>
        </div>
      </div>

      {/* Redemption history */}
      <div className="mb-3">
        <Text size="xsmall" weight="plus" className="text-ui-fg-subtle uppercase tracking-wide mb-1">
          Historia realizacji ({entitlement.redemptions.length})
        </Text>
        <RedemptionHistoryList redemptions={entitlement.redemptions} />
      </div>

      {/* Audit log */}
      <div>
        <Text size="xsmall" weight="plus" className="text-ui-fg-subtle uppercase tracking-wide mb-1">
          Audit log ({entitlement.audit_log.length})
        </Text>
        <AuditLogTimeline entries={entitlement.audit_log} />
      </div>
    </div>
  )
}

// ─── Search form ─────────────────────────────────────────────────────────────

function EntitlementSearchForm({
  onSearch,
}: {
  onSearch: (q: string) => void
}) {
  const [value, setValue] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setValue(v)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (v.length >= 3) {
        debounceRef.current = setTimeout(() => {
          onSearch(v)
        }, 400)
      } else {
        onSearch("")
      }
    },
    [onSearch]
  )

  return (
    <div className="flex flex-col gap-2 max-w-xl">
      <Label htmlFor="entitlement-search" size="base">
        Szukaj uprawnień (entitlements)
      </Label>
      <Input
        id="entitlement-search"
        type="search"
        placeholder="email, voucher_code, claim_token lub order_id (min. 3 znaki)"
        value={value}
        onChange={handleChange}
        autoComplete="off"
      />
      <Text size="xsmall" className="text-ui-fg-subtle">
        Wpisz email kupującego, kod vouchera, token claim lub ID zamówienia.
      </Text>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EntitlementsPage() {
  const [activeQuery, setActiveQuery] = useState("")

  const { data, isFetching, error } = useQuery<EntitlementsResponse>({
    queryKey: ["admin-entitlements", activeQuery],
    queryFn: () =>
      sdk.client.fetch(`/v1/admin/entitlements?q=${encodeURIComponent(activeQuery)}`),
    enabled: activeQuery.length >= 3,
    staleTime: 30_000,
  })

  const entitlements = data?.data?.entitlements ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <Container>
        <div className="px-6 py-4">
          <Heading level="h1">Entitlements — Wyszukiwarka operatora</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Znajdź dowolne uprawnienie w 30 sekund. Wyniki zawierają pełny kontekst: status, kwoty, historię realizacji i audit log.
          </Text>
        </div>

        <div className="px-6 pb-6">
          <EntitlementSearchForm onSearch={setActiveQuery} />
        </div>
      </Container>

      {/* Results */}
      {activeQuery.length >= 3 && (
        <div>
          {isFetching && (
            <Text className="text-ui-fg-subtle">Szukam…</Text>
          )}

          {!isFetching && error && (
            <div className="rounded border border-ui-border-error bg-ui-bg-error p-4">
              <Text className="text-ui-fg-error">
                Błąd wyszukiwania. Sprawdź, czy jesteś zalogowany jako operator.
              </Text>
            </div>
          )}

          {!isFetching && !error && entitlements.length === 0 && (
            <Container>
              <div className="px-6 py-4">
                <Text className="text-ui-fg-subtle">
                  Brak wyników dla zapytania „{activeQuery}".
                </Text>
              </div>
            </Container>
          )}

          {!isFetching && !error && entitlements.length > 0 && (
            <div>
              <Text size="small" className="text-ui-fg-subtle mb-3">
                Znaleziono {entitlements.length} wynik{entitlements.length === 1 ? "" : entitlements.length < 5 ? "i" : "ów"}.
              </Text>
              {entitlements.map((e) => (
                <EntitlementCard key={e.id} entitlement={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
