import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { useTranslation } from "react-i18next"

import { operatorRuntimeReadinessData as data } from "./readiness-data"

export const config: RouteConfig = {
  label: "Operator runtime readiness",
  rank: 920,
  translationNs: "gp",
}

export default function OperatorRuntimeReadinessPage() {
  const { t } = useTranslation("gp")

  return (
    <main data-route="operator-runtime-readiness">
      <section>
        <p>{t("operatorRuntimeReadiness.eyebrow")}</p>
        <h1>{t("operatorRuntimeReadiness.title")}</h1>
        <p>{t("operatorRuntimeReadiness.description")}</p>
      </section>

      <section>
        <h2>{t("operatorRuntimeReadiness.releaseBlocked")}</h2>
        <p>{data.release_blocked}</p>
        <p>{data.story_status_separation}</p>
      </section>

      <section>
        <h2>{t("operatorRuntimeReadiness.blockersTitle")}</h2>
        <ul>
          {data.blockers.map((blocker) => (
            <li key={blocker.path}>
              <strong>{blocker.path}</strong>
              <span> {blocker.registry_decision}</span>
              <small> {blocker.evidence}</small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t("operatorRuntimeReadiness.runtimeRoutesTitle")}</h2>
        <dl>
          <div>
            <dt>{t("operatorRuntimeReadiness.runtimeRouteCount")}</dt>
            <dd>{data.runtime_routes.pass}/{data.runtime_routes.total}</dd>
          </div>
          <div>
            <dt>{t("operatorRuntimeReadiness.activeEvidence")}</dt>
            <dd>{data.active_story_1_1_evidence}</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}

