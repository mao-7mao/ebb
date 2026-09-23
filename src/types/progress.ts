export type ProgressCategory = "milestone" | "meeting" | "update" | "issue" | "other";

export type ProgressStatus = "in_progress" | "review" | "stalled" | "completed";

export interface ProgressAttachment {
  name: string;
  url: string;
}

export interface ProgressEntry {
  id: string;
  member_id: string;          // 關聯至現有成員資料表 (Member.id 或 ExternalMember.id)
  date: string;               // YYYY-MM-DD
  title: string;
  description: string;
  project_id?: string;        // 關聯至專案 ID
  project_name?: string;      // 專案名稱
  category: ProgressCategory; // enum: milestone / meeting / update / issue / other
  is_key_event: boolean;      // boolean: 是否在 timeline 上以「關鍵時間點」醒目呈現
  status: ProgressStatus;     // 進行中 / 待審查 / 停滯 / 已完成
  tags: string[];             // 如：實驗, 寫作, 投稿, 口試, meeting, 專利
  attachments: ProgressAttachment[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type ExternalRoleType = "在職生" | "在職專班生" | "在職碩士生" | "在職博士生" | "校友" | "專案助理" | "專題生" | "短期訪客" | "外部合作者";

export interface ExternalMember {
  id: string;
  name_zh: string;
  name_en: string;
  role: string;               // e.g. "已畢業校友", "訪問學者", "外部合作研究員"
  role_en?: string;
  role_type: ExternalRoleType; // 身分類別
  is_external: true;
  organization?: string;      // 所屬單位或學校
  research_topic?: {
    title_zh: string;
    title_en: string;
    keywords: string[];
  };
  description?: string;
  created_at: string;
}

export interface CombinedMember {
  id: string;
  name_zh: string;
  name_en: string;
  role: string;
  role_en?: string;
  is_external: boolean;
  role_type?: ExternalRoleType;
  organization?: string;
  research_topic: {
    title_zh: string;
    title_en: string;
    keywords: string[];
  };
  description: string;
}

export interface ProgressFilterState {
  searchQuery: string;
  selectedProject: string;    // "ALL" or project_name
  selectedStatus: string;     // "ALL" or ProgressStatus
  timeRange: "all" | "this_month" | "last_3_months" | "last_6_months" | "last_year" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  memberTypeFilter: "all" | "system" | "external";
  categoryFilter: "ALL" | ProgressCategory;
  onlyKeyEvents: boolean;
  sortBy: "latest_update" | "name" | "project" | "entries_count";
  sortOrder: "asc" | "desc";
}
