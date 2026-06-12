/**
 * Story v160-8-6: Defense-in-depth security gates verification page.
 */

import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { mercurAdminClient } from "@lib/mercur-admin-client"

type GateStatus = "pass" | "fail" | "skip"

type GateResult = {
  gate: string
  status: GateStatus
  detail: string
  last_verified_at: string
}

type Result = {
  gates: GateResult[]
  overall: "pass" | "fail"
  verified_at: string
  last_run_by: string | null
  history: Array<{
    requested_gate: string
    overall: "pass" | "fail"
    verified_at: string
    last_run_by: string
  }>
}

function color(s: GateStatus): "green" | "red" | "blue" {
  return s === "pass" ? "green" : s === "fail" ? "red" : "blue"
}

function getGateLabelKey(gate: string): string {
  switch (gate) {
    case "rate_limiting":
      return "operator.security_gates.gate_rate_limiting"
    case "captcha":
      return "operator.security_gates.gate_captcha"
    case "csrf":
      return "operator.security_gates.gate_csrf"
    case "gp_config_signing":
      return "operator.security_gates.gate_gp_config_signing"
    default:
      return "operator.security_gates.detail_label"
  }
}

export function SecurityGatesPage(): React.JSX.Element {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery<Result>({
    queryKey: ["admin-operator-security-gates"],
    queryFn: () => mercurAdminClient.operator.securityGates.retrieve<Result>(),
  })
  const run = useMutation({
    mutationFn: () => mercurAdminClient.operator.securityGates.run(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-operator-security-gates"] }),
  })

  const rerunGate = useMutation({
    mutationFn: (gate: string) =>
      mercurAdminClient.operator.securityGates.run({ gate }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-operator-security-gates"] }),
  })

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">{t("operator.security_gates.title")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("operator.security_gates.subtitle")}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
            {t("actions.refresh" as any)}
          </Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending || rerunGate.isPending}>
            {t("operator.security_gates.run_all")}
          </Button>
        </div>
      </div>

      {isError && (
        <Text className="mb-4 text-ui-fg-error">{t("operator.security_gates.error")}</Text>
      )}

      {isLoading && !data && (
        <Text className="mb-4 text-ui-fg-subtle">{t("labels.loading")}</Text>
      )}

      {data && (
        <>
          <div className="mb-4">
            <Badge color={data.overall === "pass" ? "green" : "red"}>
              {t(`operator.security_gates.overall_${data.overall}`)}
            </Badge>
            <Text className="ml-3 inline">
              {t("operator.security_gates.last_verified")}: {new Date(data.verified_at).toLocaleString()}
            </Text>
            {data.last_run_by && (
              <Text className="ml-3 inline">{t("fields.by")} {data.last_run_by}</Text>
            )}
          </div>
          {data.gates.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.security_gates.empty")}</Text>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.gates.map((g) => (
                <div
                  key={g.gate}
                  className="rounded-md border border-ui-border-base p-4"
                >
                  <div className="flex items-center justify-between">
                    <Text weight="plus">{t(getGateLabelKey(g.gate), { defaultValue: g.gate })}</Text>
                    <Badge color={color(g.status)}>
                      {t(`operator.security_gates.status_${g.status}`)}
                    </Badge>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle">
                    {g.detail}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {t("operator.security_gates.last_verified")}: {new Date(g.last_verified_at).toLocaleString()}
                  </Text>
                  <Button
                    className="mt-3"
                    variant="secondary"
                    size="small"
                    onClick={() => rerunGate.mutate(g.gate)}
                    disabled={run.isPending || rerunGate.isPending}
                  >
                    {t("operator.security_gates.rerun_gate")}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Heading level="h3" className="mb-2 mt-6">
            {t("operator.security_gates.history_label")}
          </Heading>
          {data.history.length === 0 ? (
            <Text className="text-ui-fg-subtle">{t("operator.security_gates.empty")}</Text>
          ) : (
            <div className="overflow-x-auto rounded-md border border-ui-border-base">
              <table className="min-w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("operator.security_gates.history_label")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.security_gates.detail_label")}</th>
                    <th className="px-3 py-2 text-left">{t("operator.security_gates.last_verified")}</th>
                    <th className="px-3 py-2 text-left">{t("fields.by")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((entry) => (
                    <tr key={`${entry.requested_gate}-${entry.verified_at}`} className="border-t border-ui-border-base">
                      <td className="px-3 py-2">
                        {entry.requested_gate === "all"
                          ? t("operator.security_gates.run_all")
                          : t(getGateLabelKey(entry.requested_gate), { defaultValue: entry.requested_gate })}
                      </td>
                      <td className="px-3 py-2">{t(`operator.security_gates.overall_${entry.overall}`)}</td>
                      <td className="px-3 py-2">{new Date(entry.verified_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{entry.last_run_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Container>
  )
}
