/**
 * Story v160-8-5: Operator alerting page — firing alerts + 24h history +
 * configured thresholds.
 */

import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/client"

type AlertConfig = {
  id: string
  severity: "P1" | "P2" | "P3"
  nfr_ref: string
  condition: string
  evaluation_window: string
  action: "auto_rollback" | "page" | "alert"
  recipients: string[]
}

type FiringAlert = AlertConfig & {
  firing_since: string
  evaluated_value: string | number | null
}

type Result = {
  firing: FiringAlert[]
  history_24h: Array<{ alert_id: string; severity: string; firing_since: string }>
  auto_rollback_history: Array<{ audit_log_id: string; alert_id: string; at: string }>
  configured: AlertConfig[]
  computed_at: string
}

function sevColor(s: string): "red" | "orange" | "blue" {
  return s === "P1" ? "red" : s === "P2" ? "orange" : "blue"
}

export function AlertingPage(): React.JSX.Element {
  const qc = useQueryClient()
  const { data } = useQuery<Result>({
    queryKey: ["admin-operator-alerting"],
    queryFn: () => sdk.client.fetch("/admin/operator/alerting"),
  })

  const reEval = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/operator/alerting", { method: "POST" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-operator-alerting"] }),
  })

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">Operator Alerting</Heading>
          <Text className="text-ui-fg-subtle">
            8 NFR-ALERT thresholds + automated rollback wiring.
          </Text>
        </div>
        <Button onClick={() => reEval.mutate()} disabled={reEval.isPending}>
          Re-evaluate now
        </Button>
      </div>

      {data && (
        <>
          <Heading level="h3" className="mb-2">
            Firing ({data.firing.length})
          </Heading>
          {data.firing.length === 0 ? (
            <Text className="text-ui-fg-subtle">No alerts firing.</Text>
          ) : (
            <ul className="mb-4">
              {data.firing.map((a) => (
                <li
                  key={a.id}
                  className="mb-2 rounded-md border border-ui-border-base p-3"
                >
                  <Badge color={sevColor(a.severity)}>{a.severity}</Badge>
                  <Text className="ml-2 inline">{a.id}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {a.condition} → action: {a.action}
                  </Text>
                </li>
              ))}
            </ul>
          )}

          <Heading level="h3" className="mb-2">
            Configured ({data.configured.length})
          </Heading>
          <div className="overflow-x-auto rounded-md border border-ui-border-base">
            <table className="min-w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Severity</th>
                  <th className="px-3 py-2 text-left">NFR</th>
                  <th className="px-3 py-2 text-left">Window</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.configured.map((a) => (
                  <tr key={a.id} className="border-t border-ui-border-base">
                    <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
                    <td className="px-3 py-2">
                      <Badge color={sevColor(a.severity)}>{a.severity}</Badge>
                    </td>
                    <td className="px-3 py-2">{a.nfr_ref}</td>
                    <td className="px-3 py-2">{a.evaluation_window}</td>
                    <td className="px-3 py-2">{a.action}</td>
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
