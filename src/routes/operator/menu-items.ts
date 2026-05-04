import { MenuItemExtension } from "../../dashboard-app/types"

export const menuItems: MenuItemExtension[] = [
  { label: "Operator: Readiness", path: "/operator/readiness" },
  { label: "Operator: Kickoff", path: "/operator/kickoff" },
  { label: "Operator: Flag Flip", path: "/operator/flag-flip" },
  { label: "Operator: Cohort Metrics", path: "/operator/cohort-metrics" },
  { label: "Operator: Alerting", path: "/operator/alerting" },
  { label: "Operator: Security Gates", path: "/operator/security-gates" },
  { label: "Operator: Smoke Gate", path: "/operator/smoke-gate" },
]
