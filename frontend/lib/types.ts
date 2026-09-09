// ─── Creator Status ───────────────────────────────────────────────────────────

export type CreatorStatus =
  | "Pending"
  | "Contacted"
  | "In Negotiation"
  | "Confirmed"
  | "Live"
  | "Dropped";

export const CREATOR_STATUSES: CreatorStatus[] = [
  "Pending",
  "Contacted",
  "In Negotiation",
  "Confirmed",
  "Live",
  "Dropped",
];

export const STATUS_COLORS: Record<CreatorStatus, { bg: string; text: string; dot: string }> = {
  Pending: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  Contacted: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "In Negotiation": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Confirmed: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  Live: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Dropped: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

// ─── Creator ──────────────────────────────────────────────────────────────────

export interface Creator {
  id: string;
  name: string;
  phone: string;
  handle: string;
  target_budget: number;
  locked_commercials: number;
  reel_link?: string | null;
  profile_link?: string | null;
  avatar_url?: string | null;
  status: CreatorStatus;

  /** When set, the creator has been removed from the campaign and moved to the gallery. */
  removed_reason?: string | null;
  removed_at?: string | null;

  /** Custom labels/tags attached to the creator (e.g. "priority", "budget issue"). */
  tags?: string[];
}

export interface CreatorCreate {
  name: string;
  phone: string;
  handle: string;
  target_budget: number;
  locked_commercials: number;
  reel_link?: string | null;
  profile_link?: string | null;
  status?: CreatorStatus;
  final_agreed?: number;
  counter_budget?: number;
  collab_type?: string;
  removed_reason?: string | null;
  removed_at?: string | null;
  tags?: string[];
}

export interface CreatorUpdate {
  name?: string;
  phone?: string;
  handle?: string;
  target_budget?: number;
  locked_commercials?: number;
  reel_link?: string | null;
  profile_link?: string | null;
  status?: CreatorStatus;
  final_agreed?: number;
  counter_budget?: number;
  collab_type?: string;
  removed_reason?: string | null;
  removed_at?: string | null;
  tags?: string[];
}

// ─── CSV Row (from upload) ─────────────────────────────────────────────────────

export interface CSVRow {
  Name?: string;
  Phone?: string;
  Handle?: string;
  "Target Budget"?: string;
  "Locked Commercials"?: string;
  "Reel Link"?: string;
  Status?: string;
  [key: string]: string | undefined;
}

// ─── Deleted Creator (for deletion reason tracking) ──────────────────────────

export interface DeletedCreatorRecord {
  id: string;
  name: string;
  handle: string;
  phone: string;
  campaignId: string;
  campaignName: string;
  reason: string;
  deletedAt: string;
}

// ─── Campaign Summary ─────────────────────────────────────────────────────────

export interface CampaignSummary {
  totalAllocated: number;
  totalSpent: number;
  netSavings: number;
  creatorCount: number;
  liveCount: number;
}
