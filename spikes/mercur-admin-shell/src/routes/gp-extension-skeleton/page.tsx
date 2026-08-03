import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { useTranslation } from "react-i18next"

export const config: RouteConfig = {
  label: "GP extension skeleton",
  rank: 910,
  translationNs: "gp",
}

export default function GpExtensionSkeletonPage() {
  const { t } = useTranslation("gp")

  return (
    <main className="gp-extension-skeleton-page">
      <section className="gp-extension-skeleton-page__panel">
        <p className="gp-extension-skeleton-page__eyebrow">
          {t("gpExtensionSkeleton.eyebrow")}
        </p>
        <h1>{t("gpExtensionSkeleton.title")}</h1>
        <p>{t("gpExtensionSkeleton.description")}</p>
        <dl className="gp-extension-skeleton-page__facts">
          <div>
            <dt>{t("gpExtensionSkeleton.facts.routeLabel")}</dt>
            <dd>{t("gpExtensionSkeleton.facts.routeValue")}</dd>
          </div>
          <div>
            <dt>{t("gpExtensionSkeleton.facts.ownerLabel")}</dt>
            <dd>{t("gpExtensionSkeleton.facts.ownerValue")}</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
