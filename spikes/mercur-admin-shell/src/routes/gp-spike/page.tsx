import type { RouteConfig } from "@mercurjs/dashboard-sdk"

export const config: RouteConfig = {
  label: "GP Spike",
  rank: 900,
  translationNs: "gp",
}

export default function GpSpikePage() {
  return (
    <main className="gp-spike-page">
      <h1>GP Mercur shell spike</h1>
      <p>Local extension route loaded through @mercurjs/dashboard-sdk.</p>
    </main>
  )
}
