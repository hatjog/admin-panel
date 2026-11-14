/**
 * Story v1.16.0 7.8 — operator view of the gp-config market projection.
 *
 * Unlike readiness-dashboard (isError / empty only), every projection state is
 * rendered distinctly with its own remediation action; a failure never shows
 * as an empty configuration. Read-only markets (testmarketb) never render
 * write or activation affordances — this screen offers none for any market:
 * the only write path is `gp-ops config load --apply`.
 */
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { fetchMarketConfigOutcome } from "./market-config-api"
import { classifyMarketConfigResponse, type MarketConfigView } from "./market-config-state"

const STATE_BORDER: Record<MarketConfigView["state"], string> = {
  loading: "border-ui-border-base",
  ok: "border-ui-border-base",
  empty: "border-ui-border-base",
  stale: "border-ui-tag-orange-border",
  forbidden: "border-ui-border-error",
  invalid_context: "border-ui-tag-orange-border",
  backend_error: "border-ui-border-error",
}

export function MarketConfigPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // The selected market lives in the URL (`?market_id=`) so the view is linkable and reload-safe.
  const [searchParams, setSearchParams] = useSearchParams()
  const marketId = searchParams.get("market_id")?.trim() || null
  const setMarketId = (next: string | null) => setSearchParams(next ? { market_id: next } : {})
  const [draft, setDraft] = useState(marketId ?? "")

  const query = useQuery({
    queryKey: ["admin-operator-market-config", marketId],
    queryFn: () => fetchMarketConfigOutcome(marketId as string),
    enabled: marketId !== null,
    retry: false,
  })

  const view = classifyMarketConfigResponse(
    marketId === null || query.isPending || !query.data ? { kind: "pending" } : query.data
  )

  const projected = view.state === "ok" || view.state === "empty" || view.state === "stale"
  const showReadOnly = projected && view.readOnly

  const onAction = () => {
    if (view.action === "retry" || view.action === "wait") void query.refetch()
    if (view.action === "switch_market") setMarketId(null)
    if (view.action === "sign_in") navigate("/login")
  }

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">{t("operator.market_config.title")}</Heading>
        <Text className="text-ui-fg-subtle">{t("operator.market_config.subtitle")}</Text>
      </div>

      <form
        className="mb-6 flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const next = draft.trim()
          if (next) setMarketId(next)
        }}
      >
        <div className="flex-1">
          <Text size="small">{t("operator.market_config.market_label")}</Text>
          <Input
            value={draft}
            placeholder={t("operator.market_config.market_placeholder")}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          {t("operator.market_config.load")}
        </Button>
      </form>

      {marketId !== null && (
        <div data-state={view.state} data-action={view.action} className={`mb-4 rounded-md border p-4 ${STATE_BORDER[view.state]}`}>
          <div className="mb-2 flex items-center gap-2">
            <Badge>{t(`operator.market_config.states.${view.state}.title`)}</Badge>
            {showReadOnly && <Badge color="blue">{t("operator.market_config.read_only_badge")}</Badge>}
            {view.httpStatus !== null && <Text size="small">HTTP {view.httpStatus}</Text>}
          </div>
          <Text>{t(`operator.market_config.states.${view.state}.message`)}</Text>
          {(view.reason || view.errorClass) && (
            <Text size="small" className="text-ui-fg-subtle">
              {t("operator.market_config.reason_label")}: {view.reason ?? view.errorClass}
            </Text>
          )}
          {view.actionKey && view.state !== "ok" && (
            <Button className="mt-3" variant="secondary" size="small" onClick={onAction}>
              {view.action === "sign_in"
                ? t("operator.market_config.states.forbidden.action_sign_in")
                : t(`operator.market_config.states.${view.state}.action`)}
            </Button>
          )}
          {showReadOnly && (
            <Text size="small" className="mt-2 block text-ui-fg-subtle">
              {t("operator.market_config.read_only_notice")}
            </Text>
          )}
        </div>
      )}

      {view.config && (
        <pre className="max-h-[480px] overflow-auto rounded-md bg-ui-bg-subtle p-4 text-xs">
          {JSON.stringify(view.config, null, 2)}
        </pre>
      )}
    </Container>
  )
}
