export type CalendarEntryStatus = "done" | "in_progress" | "cancelled";
export type CalendarEntryPriority = "high" | "normal" | "low";

export interface CalendarEntry {
  id: string;
  user_id?: string;
  user_name?: string;
  date: string;              // YYYY-MM-DD (start date)
  end_date?: string;         // YYYY-MM-DD (optional for multi-day events)
  title: string;
  description?: string;
  tags: string[];            // e.g. ["實驗", "寫作", "投稿", "開會", "行政", "教學"]
  status: CalendarEntryStatus; // "done" | "in_progress" | "cancelled"
  priority?: CalendarEntryPriority; // "high" | "normal" | "low"
  project_id?: string;
  project_name?: string;     // e.g. "PEF", "5-HMF", "生物質混凝土", "液態覆蓋膜"
  google_event_id?: string;  // Google Calendar event ID for 2-way sync
  google_sync_status?: "synced" | "local_only" | "error" | "pending";
  google_sync_time?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportConfig {
  weekStartDate: string;     // YYYY-MM-DD (Monday)
  weekEndDate: string;       // YYYY-MM-DD (Sunday)
  authorName: string;
  labName: string;
  reportTitle: string;
  includeNextWeek: boolean;
  includeReflection: boolean;
  reflectionNote: string;
  nextWeekTasks: Array<{
    title: string;
    project_name?: string;
    priority: CalendarEntryPriority;
    note?: string;
    tags?: string[];
  }>;
}

export interface GoogleSyncConfig {
  clientId: string;
  calendarId: string;
  autoSync: boolean;
  syncDirection: "bidirectional" | "to_google" | "from_google";
  lastSyncTime?: string;
}

export const LAB_PROJECT_OPTIONS = [
  { id: "pef", name: "PEF 新一代生物基聚酯材料", shortName: "PEF" },
  { id: "5hmf", name: "5-HMF 綠色生質精煉製程", shortName: "5-HMF" },
  { id: "biomass-concrete", name: "生物質綠色混凝土 / 碳匯材料", shortName: "生物質混凝土" },
  { id: "mulch-film", name: "農業創新液態覆蓋膜", shortName: "液態覆蓋膜" },
  { id: "general", name: "實驗室通用 / 行政與教學", shortName: "行政教學" }
];

export const DEFAULT_CALENDAR_TAGS = [
  "實驗",
  "寫作",
  "投稿",
  "開會",
  "行政",
  "教學",
  "數據分析",
  "儀器檢測",
  "專利",
  "文獻研讀"
];

export const TAG_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "實驗": { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  "寫作": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  "投稿": { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-500" },
  "開會": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  "行政": { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
  "教學": { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", dot: "bg-teal-500" },
  "數據分析": { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
  "儀器檢測": { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" },
  "專利": { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500" },
  "文獻研讀": { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300", dot: "bg-amber-600" }
};
