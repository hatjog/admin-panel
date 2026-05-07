import { StatusCell } from "@components/table/table-cells/common/status-cell";

export const SellerStatusBadge = ({ 
  status, 
  "data-testid": dataTestId 
}: { 
  status: string
  "data-testid"?: string 
}) => {
  switch (status) {
    case "closed":   // Mercur 2 equivalent of Mercur 1.5 "INACTIVE"
      return <StatusCell color="orange" data-testid={dataTestId}>{status}</StatusCell>;
    case "open":     // Mercur 2 equivalent of Mercur 1.5 "ACTIVE"
      return <StatusCell color="green" data-testid={dataTestId}>{status}</StatusCell>;
    case "suspended": // Mercur 2 equivalent of Mercur 1.5 "SUSPENDED"
      return <StatusCell color="red" data-testid={dataTestId}>{status}</StatusCell>;
    case "pending_approval":
      return <StatusCell color="orange" data-testid={dataTestId}>{status}</StatusCell>;
    case "terminated":
      return <StatusCell color="red" data-testid={dataTestId}>{status}</StatusCell>;
    default:
      return <StatusCell color="grey" data-testid={dataTestId}>{status}</StatusCell>;
  }
};
