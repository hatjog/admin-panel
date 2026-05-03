/**
 * Story v160-8-6: Defense-in-depth security gates verification page.
 */

import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/client"

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
}

function color(s: GateStatus): "green" | "red" | "blue" {
  return s === "pass" ? "green" : s === "fail" ? "red" : "blue"
}

export function SecurityGatesPage(): React.JSX.Element {
  const qc = useQueryClient()
  const { data } = useQuery<Result>({
    queryKey: ["admin-operator-security-gates"],
    queryFn: () => sdk.client.fetch("/admin/operator/security-gates"),
  })
  const run = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/operator/security-gates", { method: "POST" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-operator-security-gates"] }),
  })

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1">Security Gates</Heading>
          <Text className="text-ui-fg-subtle">
            Rate limit / CAPTCHA / CSRF / gp-config Ed25519 signing.
          </Text>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          Run all gates
        </Button>
      </div>

      {data && (
        <>
          <div className="mb-4">
            <Badge color={data.overall === "pass" ? "green" : "red"}>
              Overall: {data.overall.toUpperCase()}
            </Badge>
            <Text className="ml-3 inline">
              Verified: {new Date(data.verified_at).toLocaleString()}
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.gates.map((g) => (
              <div
                key={g.gate}
                className="rounded-md border border-ui-border-base p-4"
              >
                <div className="flex items-center justify-between">
                  <Text weight="plus">{g.gate}</Text>
                  <Badge color={color(g.status)}>{g.status}</Badge>
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  {g.detail}
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {new Date(g.last_verified_at).toLocaleString()}
                </Text>
              </div>
            ))}
          </div>
        </>
      )}
    </Container>
  )
}
