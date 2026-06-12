/**
 * Story v160-8-7: Phase B SMOKE GATE binary checklist + ratify CTA.
 */

import { useState } from "react"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { mercurAdminClient } from "@lib/mercur-admin-client"

import { BinaryVerdictBadge } from "./components/BinaryVerdictBadge"
import { ChecklistTable } from "./components/ChecklistTable"
import { RatifyConfirmModal } from "./components/RatifyConfirmModal"

type Item = {
  key: string
  label: string
  nfr_ref: string
  status: "pass" | "fail" | "unknown"
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

export function SmokeGatePage(): React.JSX.Element {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [adminNote, setAdminNote] = useState("")
  const [confirming, setConfirming] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<State>({
    queryKey: ["admin-operator-smoke-gate"],
    queryFn: () => mercurAdminClient.operator.smokeGate.status<State>(),
  })

  const ratify = useMutation({
    mutationFn: (verdict: "pass" | "fail") =>
      mercurAdminClient.operator.smokeGate.ratify({
        verdict,
        admin_note: adminNote,
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
            <BinaryVerdictBadge verdict={data.computed} />
            {data.last_ratified && (
              <Text className="ml-3 inline">
                {t("operator.smoke_gate.last_ratified_label")}: {data.last_ratified.verdict.toUpperCase()} {t("fields.by")} {data.last_ratified.admin_id} - {new Date(data.last_ratified.ratified_at).toLocaleString()}
              </Text>
            )}
          </div>

          <ChecklistTable items={data.items} />

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
              <RatifyConfirmModal
                adminNote={adminNote}
                isPending={ratify.isPending}
                onAdminNoteChange={setAdminNote}
                onPass={() => ratify.mutate("pass")}
                onFail={() => ratify.mutate("fail")}
                onCancel={() => setConfirming(false)}
              />
            )}
          </div>
        </>
      )}
    </Container>
  )
}
