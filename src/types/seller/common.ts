// Mercur 2 SellerStatus values (lowercase). Mercur 1.5 used uppercase "ACTIVE"/"SUSPENDED"/"INACTIVE";
// Mercur 2 uses SellerStatus.OPEN="open", SellerStatus.SUSPENDED="suspended", SellerStatus.TERMINATED="terminated".
// Enum keys renamed to match Mercur 2 SellerStatus vocabulary (OPEN/SUSPENDED instead of
// ACTIVE/SUSPENDED) so reading code matches semantics. The legacy INACTIVE=>"closed" entry
// was removed (no callsite consumed it; review-fix AP-1 + AP-3 v160-cleanup-62a).
// If a future feature needs CLOSED/TERMINATED state, add it explicitly with a Mercur 2 key.
export enum StoreStatus {
  OPEN = "open",
  SUSPENDED = "suspended",
}

export type SellerDTO = {
  id: string;
  store_status: StoreStatus;
  created_at: Date;
  updated_at: Date;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  tax_id: string | null;
  handle: string;
  photo: string | null;
  members?: Partial<MemberDTO>[];
};

export type SellerWithPayoutAccountDTO = SellerDTO & {
  payout_account: {
    id: string;
    created_at: Date;
    updated_at: Date;
    reference_id: string;
    data: Record<string, unknown>;
    status: string;
  };
};

export enum MemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

export type MemberDTO = {
  id: string;
  created_at: Date;
  updated_at: Date;
  role: MemberRole;
  email: string | null;
  name: string | null;
  bio: string | null;
  photo: string | null;
  phone: string | null;
  seller?: Partial<SellerDTO>;
};

export type MemberInviteDTO = {
  id: string;
  created_at: Date;
  updated_at: Date;
  email: string;
  role: MemberRole;
  seller?: Partial<SellerDTO>;
  token: string;
  expires_at: Date;
  accepted: boolean;
};

export interface VendorSeller {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description?: string | null;
  store_status: string;
  handle: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country_code?: string | null;
  tax_id?: string | null;
  members?: VendorMember[];
}

export interface VendorMember {
  id: string;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "member";
  email: string;
  name?: string | null;
  bio?: string | null;
  photo?: string | null;
}
