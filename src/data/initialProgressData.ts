import { ProgressEntry, ExternalMember } from "../types/progress";

export const DEFAULT_TAGS = [
  "實驗",
  "寫作",
  "投稿",
  "口試",
  "meeting",
  "專利",
  "儀器檢測",
  "數據分析",
  "文獻研讀",
  "廠商討論",
  "請購驗收"
];

export const CATEGORY_CONFIG = {
  milestone: {
    label: "重要里程碑",
    label_en: "Milestone",
    color: "amber",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    dotBg: "bg-amber-500 ring-4 ring-amber-100",
    icon: "Milestone"
  },
  meeting: {
    label: "進度會議",
    label_en: "Meeting",
    color: "emerald",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dotBg: "bg-emerald-600 ring-3 ring-emerald-100",
    icon: "Users"
  },
  update: {
    label: "一般更新",
    label_en: "Update",
    color: "sky",
    badgeBg: "bg-sky-100 text-sky-900 border-sky-300",
    dotBg: "bg-sky-600 ring-2 ring-sky-100",
    icon: "TrendingUp"
  },
  issue: {
    label: "遭遇問題",
    label_en: "Issue",
    color: "rose",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
    dotBg: "bg-rose-600 ring-4 ring-rose-100",
    icon: "AlertTriangle"
  },
  other: {
    label: "其他事項",
    label_en: "Other",
    color: "slate",
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
    dotBg: "bg-slate-500 ring-2 ring-slate-100",
    icon: "Bookmark"
  }
} as const;

export const STATUS_CONFIG = {
  in_progress: {
    label: "進行中",
    label_en: "In Progress",
    badgeClass: "bg-[#004b3a]/10 text-[#004b3a] border-[#004b3a]/25",
    dotClass: "bg-[#004b3a]"
  },
  review: {
    label: "待審查",
    label_en: "Under Review",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500"
  },
  stalled: {
    label: "停滯中",
    label_en: "Stalled",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    dotClass: "bg-rose-500"
  },
  completed: {
    label: "已完成",
    label_en: "Completed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400"
  }
} as const;

export const initialExternalMembers: ExternalMember[] = [];

export const initialProgressEntries: ProgressEntry[] = [];
