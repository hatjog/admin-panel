/**
 * Story v160-8-7: Phase B SMOKE GATE binary checklist + ratify CTA.
 */

import { useState } from "react"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "@lib/client"

type ItemStatus = "pass" | "fail" | "unknown"

type Item = {
  key: string
  label: string
  nfr_ref: string
  status: ItemStatus
  evidence_url: string
  source: string
}

type State = {
  items: Item[]
  computed: "pass" | "fail" | "pending"
  last_ratified: {
    verdict: "pass" | "fail"
    admin_id: string
    admin_note: string
    ratified_at: string
  } | null
  computed_at: string
}

function color(s: ItemStatus): "green" | "red" | "blue" {
  return s === "pass" ? "green" : s === "fail" ? "red" : "blue"
}

export function SmokeGatePage(): React.JSX.Element {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [adminNote, setAdminNote] = useState("")
  const [confirming, setConfirming] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<State>({
    queryKey: ["admin-operator-smoke-gate"],
    queryFn: () => sdk.client.fetch("/admin/operator/smoke-gate-status"),
  })

  const ratify = useMutation({
    mutationFn: (verdict: "pass" | "fail") =>
      sdk.client.fetch("/admin/operator/smoke-gate-ratify", {
        method: "POST",
        body: { verdict, admin_note: adminNote },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-operator-smoke-gate"] })
      setConfirming(false)
      setAdminNote("")
    },
  })

  const allPass = data?.items.every((i) => i.status === "pass")
  const anyFail = data?.items.some((i) => i.status === "fail")

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">{t("operator.smoke_gate.title")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("operator.smoke_gate.subtitle")}
          </Text>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          {t("operator.smoke_gate.refresh")}
        </Button>
      </div>

      {isLoading && <Text>{t("labels.loading")}</Text>}

      {isError && (
        <div className="mb-4 rounded-md border border-ui-border-error bg-ui-bg-error p-4">
          <Text>{t("operator.smoke_gate.error")}</Text>
        </div>
      )}

      {!isLoading && !data && !isError && <Text>{t("operator.smoke_gate.empty")}</Text>}

      {data && (
        <>
          <div className="mb-4 rounded-md border border-ui-border-base p-4">
            <Badge color={data.computed === "pass" ? "green" : data.computed === "fail" ? "red" : "blue"}>
              {t("operator.smoke_gate.computed_label")}: {t(`operator.smoke_gate.verdict_${data.computed}`)}
            </Badge>
            {data.last_ratified && (
              <Text className="ml-3 inline">
                {t("operator.smoke_gate.last_ratified_label")}: {data.last_ratified.verdict.toUpperCase()} {t("fields.by")} {data.last_ratified.admin_id} - {new Date(data.last_ratified.ratified_at).toLocaleString()}
              </Text>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border border-ui-border-base">
            <table className="min-w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_item_label")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_nfr_ref")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_status")}</th>
                  <th className="px-3 py-2 text-left">{t("operator.smoke_gate.checklist_evidence")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.key} className="border-t border-ui-border-base">
                    <td className="px-3 py-2">{it.label}</td>
                    <td className="px-3 py-2">{it.nfr_ref}</td>
                    <td className="px-3 py-2">
                      <Badge color={color(it.status)}>{t(`operator.smoke_gate.status_${it.status}`)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <a
                        className="text-ui-fg-interactive underline"
                        href={it.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("operator.smoke_gate.evidence_view")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            {!confirming && (
              <Button disabled={!allPass} onClick={() => setConfirming(true)}>
                {t("operator.smoke_gate.ratify_cta")}
              </Button>
            )}
            {anyFail && (
              <Text className="ml-3 text-ui-fg-error inline">
                {t("operator.smoke_gate.ratify_blocked_message")}
              </Text>
            )}
            {confirming && (
              <div className="mt-3 rounded-md border border-ui-border-base p-3">
                <Text className="mb-2" weight="plus">
                  {t("operator.smoke_gate.confirm_modal_title")}
                </Text>
                <Text className="mb-3 text-ui-fg-subtle">
                  {t("operator.smoke_gate.confirm_modal_message")}
                </Text>
                <Input
                  placeholder={t("operator.smoke_gate.admin_note_required")}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => ratify.mutate("pass")} disabled={ratify.isPending}>
                    {t("operator.smoke_gate.ratify_pass")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => ratify.mutate("fail")}
                    disabled={ratify.isPending}
                  >
                    {t("operator.smoke_gate.ratify_fail")}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(false)}>
                    {t("operator.smoke_gate.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Container>
  )
}
