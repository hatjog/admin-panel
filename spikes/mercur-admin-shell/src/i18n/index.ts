const resources = {
  pl: {
    gp: {
      gpExtensionSkeleton: {
        description:
          "Minimalna trasa lokalna GP dziala obok stron Mercur bez kopiowania upstreamowych widokow.",
        eyebrow: "GP admin extension",
        facts: {
          ownerLabel: "Wlasciciel",
          ownerValue: "admin-convergence",
          routeLabel: "Model trasy",
          routeValue: "Mercur dashboard SDK",
        },
        navigationLabel: "GP extension skeleton",
        title: "Szkielet trasy rozszerzenia GP",
      },
      operatorRuntimeReadiness: {
        activeEvidence: "Aktywne evidence",
        blockersTitle: "Blokery Story 1.1",
        description:
          "Widok pokazuje, ze pierwsza trasa rozszerzenia GP nie znosi blokady agregatu Mercur runtime.",
        eyebrow: "Gotowosc operatora",
        releaseBlocked: "Release blocked",
        runtimeRouteCount: "Trasy runtime PASS",
        runtimeRoutesTitle: "Stan tras runtime",
        title: "Operator runtime readiness",
      },
    },
  },
  en: {
    gp: {
      gpExtensionSkeleton: {
        description:
          "A minimal local GP route runs beside Mercur pages without copying upstream-owned views.",
        eyebrow: "GP admin extension",
        facts: {
          ownerLabel: "Owner",
          ownerValue: "admin-convergence",
          routeLabel: "Route model",
          routeValue: "Mercur dashboard SDK",
        },
        navigationLabel: "GP extension skeleton",
        title: "GP extension route skeleton",
      },
      operatorRuntimeReadiness: {
        activeEvidence: "Active evidence",
        blockersTitle: "Story 1.1 blockers",
        description:
          "This view shows that the first GP extension route does not clear the Mercur runtime aggregate block.",
        eyebrow: "Operator readiness",
        releaseBlocked: "Release blocked",
        runtimeRouteCount: "Runtime routes PASS",
        runtimeRoutesTitle: "Runtime route state",
        title: "Operator runtime readiness",
      },
    },
  },
}

export default resources
