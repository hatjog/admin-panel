/**
 * Story v160-8-3: Tri-state flag flip operator page.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type FlagState = "off" | "shadow" | "on"

type FlagStatus = {
  current_state: FlagState
  allowed_transitions: FlagState[]
  last_transitioned_at: string | null
  last_admin: string | null
  audit_trail: Array<{
    audit_log_id: string
    from: FlagState
    to: FlagState
    triggered_by: string
    admin_note?: string
    smoke_gate_ref?: string
    cache_invalidate_outcome?: { errors?: string[]; duration_ms?: number }
    at: string
  }>
}

type SmokeGateStatus = {
  computed: "pass" | "fail" | "pending"
  last_ratified?: { verdict: "pass" | "fail" } | null
}

function badgeColor(s: FlagState): "red" | "orange" | "green" {
  return s === "off" ? "red" : s === "shadow" ? "orange" : "green"
}

export function FlagFlipPage(): React.JSX.Element {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [target, setTarget] = useState<FlagState | null>(null)
  const [adminNote, setAdminNote] = useState("")

  const { data: status, isLoading, isError, refetch } = useQuery<FlagStatus>({
    queryKey: ["admin-operator-flag-flip"],
    queryFn: () => mercurAdminClient.operator.flagFlip.retrieve<FlagStatus>(),
  })
  const { data: gate } = useQuery<SmokeGateStatus>({
    queryKey: ["admin-operator-smoke-gate-status"],
    queryFn: () => mercurAdminClient.operator.smokeGate.status<SmokeGateStatus>(),
  })

  const transition = useMutation({
    mutationFn: (to: FlagState) =>
      mercurAdminClient.operator.flagFlip.transition({
        to_state: to,
        admin_note: adminNote,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operator-flag-flip"] })
      setTarget(null)
      setAdminNote("")
    },
  })

  const ratifiedPass = gate?.last_ratified?.verdict === "pass"

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">{t("operator.flag_flip.title")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("operator.flag_flip.subtitle")}
          </Text>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          {t("operator.flag_flip.refresh")}
        </Button>
      </div>

      {isLoading && <Text>{t("labels.loading")}</Text>}

      {isError && (
        <div className="mb-4 rounded-md border border-ui-border-error bg-ui-bg-error p-3">
          <Text>{t("operator.flag_flip.error")}</Text>
        </div>
      )}

      {!ratifiedPass && (
        <div className="mb-4 rounded-md border border-ui-border-error bg-ui-bg-error p-3">
          <Text>
            {t("operator.flag_flip.smoke_gate_banner_blocked")}
          </Text>
        </div>
      )}

      {status && (
        <>
          <div className="mb-6 rounded-md border border-ui-border-base p-4">
            <Badge color={badgeColor(status.current_state)}>
              {t(`operator.flag_flip.current_state_${status.current_state}`)}
            </Badge>
            <Text className="ml-3 inline">
              {t("operator.smoke_gate.last_ratified_label").replace(/ratified/i, "transition")}:{" "}
              {status.last_transitioned_at
                ? new Date(status.last_transitioned_at).toLocaleString()
                : "—"}{" "}
              {t("fields.by")} {status.last_admin ?? "—"}
            </Text>
          </div>

          <div className="mb-4 flex gap-2">
            {(["off", "shadow", "on"] as FlagState[]).map((s) => (
              <Button
                key={s}
                disabled={!status.allowed_transitions.includes(s)}
                variant={status.current_state === s ? "secondary" : "primary"}
                onClick={() => setTarget(s)}
              >
                {t(`operator.flag_flip.transition_to_${s}`)}
              </Button>
            ))}
          </div>

          {target && (
            <div className="mb-4 rounded-md border border-ui-border-base p-4">
              <Text className="mb-2" weight="plus">
                {t("operator.flag_flip.confirm_title")}
              </Text>
              <Text>
                {t("operator.flag_flip.confirm_message")}
              </Text>
              <Input
                className="mt-2"
                placeholder={t("operator.flag_flip.admin_note")}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => transition.mutate(target)}
                  disabled={transition.isPending}
                >
                  {t("operator.flag_flip.confirm")}
                </Button>
                <Button variant="secondary" onClick={() => setTarget(null)}>
                  {t("operator.flag_flip.cancel")}
                </Button>
              </div>
            </div>
          )}

          <Heading level="h3" className="mb-2">
            {t("operator.alerting.history_24h")}
          </Heading>
          <div className="overflow-x-auto rounded-md border border-ui-border-base">
            <table className="min-w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">{t("operator.flag_flip.audit_table_when")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.flag_flip.audit_table_transition")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.flag_flip.audit_table_by")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.flag_flip.audit_table_note")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.flag_flip.audit_table_cache")}</th>
                </tr>
              </thead>
              <tbody>
                {status.audit_trail.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-ui-fg-subtle" colSpan={5}>
                      {t("operator.flag_flip.audit_empty")}
                    </td>
                  </tr>
                )}
                {status.audit_trail.map((e) => (
                  <tr key={e.audit_log_id} className="border-t border-ui-border-base">
                    <td className="px-3 py-2">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {e.from} → {e.to}
                    </td>
                    <td className="px-3 py-2">{e.triggered_by}</td>
                    <td className="px-3 py-2">{e.admin_note ?? "—"}</td>
                    <td className="px-3 py-2">
                      {e.cache_invalidate_outcome?.errors?.length
                        ? `${t("operator.flag_flip.cache_invalidate_outcome_errors")}: ${e.cache_invalidate_outcome.errors.length}`
                        : t("operator.flag_flip.cache_invalidate_outcome_ok")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Container>
  )
}
