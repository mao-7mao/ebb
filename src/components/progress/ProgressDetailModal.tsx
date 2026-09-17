import React from "react";
import { ProgressEntry, CombinedMember } from "../../types/progress";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "../../data/initialProgressData";
import { 
  X, 
  Calendar, 
  Tag, 
  ExternalLink, 
  Sparkles, 
  Edit3, 
  Trash2, 
  User, 
  FolderGit2, 
  FileText 
} from "lucide-react";

interface ProgressDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ProgressEntry | null;
  member: CombinedMember | undefined;
  onEdit: (entry: ProgressEntry) => void;
  onDelete: (id: string) => void;
}

export default function ProgressDetailModal({
  isOpen,
  onClose,
  entry,
  member,
  onEdit,
  onDelete
}: ProgressDetailModalProps) {
  if (!isOpen || !entry) return null;

  const categoryCfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;
  const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.in_progress;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm max-w-xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-start justify-between p-6 bg-[#f8f8f5] border-b border-[#e5e5e0]">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-xs text-[10.5px] font-bold border ${categoryCfg.badgeBg}`}>
                {categoryCfg.label}
              </span>
              <span className={`px-2 py-0.5 rounded-xs text-[10.5px] font-bold border ${statusCfg.badgeClass}`}>
                {statusCfg.label}
              </span>
              {entry.is_key_event && (
                <span className="px-2 py-0.5 rounded-xs text-[10.5px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 fill-white" />
                  關鍵里程碑
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-[#1a1a1a] font-serif leading-snug pt-1">
              {entry.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
              <span className="flex items-center gap-1 text-[#1b4372] font-bold">
                <User className="w-3.5 h-3.5" />
                {member ? `${member.name_zh} (${member.name_en})` : entry.member_id}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {entry.date}
              </span>
              {entry.project_name && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[#8d734a] font-serif">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    {entry.project_name}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-sm hover:bg-white transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Description */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
              進度詳細描述
            </span>
            <div className="bg-white border border-[#e5e5e0] p-4 rounded-sm leading-relaxed text-sm whitespace-pre-wrap font-sans text-slate-800 shadow-2xs">
              {entry.description || "（尚無補充說明內容）"}
            </div>
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                關聯標籤
              </span>
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-[#1b4372]/5 text-[#1b4372] border border-[#1b4372]/20 rounded-xs text-xs font-mono font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {entry.attachments && entry.attachments.length > 0 && (
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                附件與雲端資料 ({entry.attachments.length})
              </span>
              <div className="space-y-1.5">
                {entry.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 bg-white border border-[#e5e5e0] hover:border-[#1b4372] hover:bg-[#f8f8f5] rounded-sm transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#1b4372] shrink-0" />
                      <span className="font-bold text-slate-800 group-hover:text-[#1b4372] truncate">
                        {att.name}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1b4372] shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="pt-2 border-t border-[#e5e5e0] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>建立時間: {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : entry.date}</span>
            <span>紀錄編號: {entry.id}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f8f5] border-t border-[#e5e5e0]">
          <button
            type="button"
            onClick={() => {
              if (confirm("確定要刪除此筆進度紀錄嗎？此動作無法復原。")) {
                onDelete(entry.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm font-medium transition text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            刪除紀錄
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-medium transition text-xs"
            >
              關閉
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold transition text-xs shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              編輯此筆
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
