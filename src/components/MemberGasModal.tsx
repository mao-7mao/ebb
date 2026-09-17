import React, { useState } from "react";
import { 
  Cloud, 
  Copy, 
  Check, 
  ExternalLink, 
  FileCode2, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Database,
  ArrowDownCircle,
  ArrowUpCircle,
  X
} from "lucide-react";
import { MEMBER_APPS_SCRIPT_SAMPLE } from "../data/memberGasCodeSample";
import { 
  getSavedMemberWebhookUrl, 
  saveMemberWebhookUrl, 
  pingMemberWebhook, 
  fetchMemberDataFromGoogle, 
  syncMemberDataToGoogle,
  GoogleSyncFetchResult
} from "../services/googleMemberSyncService";
import { Member, Meeting } from "../data/labData";
import { ProgressEntry, ExternalMember } from "../types/progress";

interface MemberGasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMembers?: Member[];
  currentMeetings?: Meeting[];
  currentProgressEntries?: ProgressEntry[];
  currentExternalMembers?: ExternalMember[];
  onDataLoadedFromGoogle?: (data: {
    members?: Member[];
    meetings?: Meeting[];
    progressEntries?: ProgressEntry[];
    externalMembers?: ExternalMember[];
  }) => void;
}

export default function MemberGasModal({
  isOpen,
  onClose,
  currentMembers,
  currentMeetings,
  currentProgressEntries,
  currentExternalMembers,
  onDataLoadedFromGoogle
}: MemberGasModalProps) {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => getSavedMemberWebhookUrl());
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(MEMBER_APPS_SCRIPT_SAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([MEMBER_APPS_SCRIPT_SAMPLE], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MemberData_Code.gs";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveUrl = () => {
    saveMemberWebhookUrl(webhookUrl);
    setStatusMessage({ type: "success", text: "Google Apps Script 網址已儲存！" });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleTestPing = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({ type: "error", text: "請先輸入 Google Apps Script Webhook 網址。" });
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);
    saveMemberWebhookUrl(webhookUrl);

    const res = await pingMemberWebhook(webhookUrl);
    setIsTesting(false);
    if (res.success) {
      setStatusMessage({ type: "success", text: res.message });
    } else {
      setStatusMessage({ type: "error", text: res.message });
    }
  };

  const handleFetchFromGoogle = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({ type: "error", text: "請先填寫 Webhook 網址後再進行同步！" });
      return;
    }
    setIsFetching(true);
    setStatusMessage(null);
    saveMemberWebhookUrl(webhookUrl);

    const res: GoogleSyncFetchResult = await fetchMemberDataFromGoogle(webhookUrl);
    setIsFetching(false);

    if (res.success && res.data) {
      const { members, meetings, progressEntries, externalMembers } = res.data;
      if (onDataLoadedFromGoogle) {
        onDataLoadedFromGoogle({
          members: members && members.length > 0 ? members : undefined,
          meetings: meetings && meetings.length > 0 ? meetings : undefined,
          progressEntries: progressEntries && progressEntries.length > 0 ? progressEntries : undefined,
          externalMembers: externalMembers && externalMembers.length > 0 ? externalMembers : undefined
        });
      }
      setStatusMessage({
        type: "success",
        text: `已成功從 Google Sheet 載入：${members?.length || 0} 位成員、${meetings?.length || 0} 筆會議、${progressEntries?.length || 0} 筆研究進度！`
      });
    } else {
      setStatusMessage({
        type: "error",
        text: `讀取失敗: ${res.error || "請確認試算表已有資料或 Apps Script 部署設定正確"}`
      });
    }
  };

  const handlePushToGoogle = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({ type: "error", text: "請先填寫 Webhook 網址後再進行同步！" });
      return;
    }
    setIsPushing(true);
    setStatusMessage(null);
    saveMemberWebhookUrl(webhookUrl);

    const payload = {
      members: currentMembers,
      meetings: currentMeetings,
      progressEntries: currentProgressEntries,
      externalMembers: currentExternalMembers
    };

    const res = await syncMemberDataToGoogle(payload, "sync_all", webhookUrl);
    setIsPushing(false);

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: "當前所有成員、會議與進度紀錄已成功同步上傳至 Google Sheet 試算表！"
      });
    } else {
      setStatusMessage({
        type: "error",
        text: res.message
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#e6e1d6] rounded-sm shadow-2xl max-w-3xl w-full my-auto p-5 sm:p-6 space-y-4 font-sans text-xs max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-sm bg-[#1b4372] text-white">
              <Cloud className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm font-serif">
                人員名冊、會議時程與進度紀錄 - Google Sheet 雲端雙向同步
              </h3>
              <p className="text-[11px] text-[#8d734a] font-mono">
                專屬腳本：/google-apps-script/MemberData_Code.gs (免 Git 部署即可同步維護)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className={`p-3 rounded-sm border flex items-center gap-2 text-xs animate-fadeIn ${
            statusMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-300 text-emerald-900" 
              : statusMessage.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-blue-50 border-blue-300 text-blue-900"
          }`}>
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Webhook URL Input and Action Controls */}
        <div className="p-3.5 bg-[#fbf9f5] border border-[#e6e1d6] rounded-sm space-y-3">
          <label className="block text-slate-700 font-bold text-xs font-serif">
            Google Apps Script 網頁應用程式網址 (Web app URL)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-3 py-2 border border-[#d5cec2] bg-white rounded-sm text-xs font-mono focus:border-[#1b4372] focus:outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSaveUrl}
                className="px-3 py-2 bg-[#1b4372] text-white rounded-sm font-serif font-bold hover:bg-[#122e4f] transition cursor-pointer"
              >
                儲存網址
              </button>
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTesting}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-sm font-medium hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>測試連線</span>
              </button>
            </div>
          </div>

          {/* Quick Dual-Direction Sync Actions */}
          <div className="pt-2 border-t border-[#e6e1d6] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 font-mono">
              💡 設定完成後，日後修改人員、排定會議或新增進度日誌，可直接在此與 Google Sheet 雙向同步：
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFetchFromGoogle}
                disabled={isFetching || !webhookUrl.trim()}
                className="px-3 py-1.5 bg-blue-50 border border-[#1b4372]/30 text-[#1b4372] rounded-sm font-bold text-xs hover:bg-blue-100/70 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="從 Google 試算表載入最新人員、在職生、會議與研究進度"
              >
                {isFetching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                <span>從雲端讀取最新資料</span>
              </button>
              <button
                type="button"
                onClick={handlePushToGoogle}
                disabled={isPushing || !webhookUrl.trim()}
                className="px-3 py-1.5 bg-[#1b4372] text-white rounded-sm font-bold text-xs hover:bg-[#122e4f] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="將當前網頁的所有人員名單、會議時程與進度紀錄上傳備份至 Google 試算表"
              >
                {isPushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                <span>同步備份至 Google Sheet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step-by-Step Deployment Guide */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-800 text-xs font-serif flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-[#1b4372]" />
            <span>5 步驟 Google Sheet 與 Apps Script 部署設定教學：</span>
          </h4>

          <ol className="list-decimal list-inside space-y-2 text-slate-600 bg-slate-50 p-3.5 rounded-sm border border-slate-200 leading-relaxed">
            <li>
              <strong>新建專屬 Google 試算表</strong>：前往{" "}
              <a 
                href="https://sheets.new" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#1b4372] underline font-bold inline-flex items-center gap-0.5"
              >
                sheets.new <ExternalLink className="w-3 h-3" />
              </a>
              ，建立一個新試算表（命名為例如：<code>EBB Lab 人員名冊與研究進度資料庫</code>）。
            </li>
            <li>
              <strong>開啟 Apps Script 編輯器</strong>：在該試算表上方選單點選<strong>「擴充功能」</strong>-&gt;<strong>「Apps Script」</strong>。
            </li>
            <li>
              <strong>貼上專屬後端腳本</strong>：清空預設代碼，點選下方<strong>「複製 MemberData_Code.gs 程式碼」</strong>按鈕，覆蓋貼入並按下 <strong>儲存 (Ctrl+S / Cmd+S)</strong>。
            </li>
            <li>
              <strong>部署為網頁應用程式 (Web app)</strong>：
              <div className="ml-5 mt-1 text-slate-700 bg-white p-2 border border-slate-200 rounded text-[11px] space-y-1">
                <div>• 點選右上角 <strong>「部署 (Deploy)」</strong> -&gt; <strong>「新增部署作業 (New deployment)」</strong></div>
                <div>• 點選左側齒輪圖示，選擇 <strong>「Web app（網頁應用程式）」</strong></div>
                <div>• 執行身分 (Execute as)：選擇 <strong>「我 (Me / 您的 Google 帳號)」</strong></div>
                <div className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  • 誰可以存取 (Who has access)：【務必選 Anyone (任何人)】（才能讓網頁免登入直接雙向讀寫試算表）
                </div>
              </div>
            </li>
            <li>
              <strong>取得網址並貼回</strong>：點擊「部署」並授權存取後，複製獲得的 <code>/exec</code> 結尾網址，貼回上方欄位點「儲存網址」即大功告成！
            </li>
          </ol>
        </div>

        {/* Code Snippet and Copy Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-[#8d734a]" />
              <span>腳本檔案內容預覽 (MemberData_Code.gs)：</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadFile}
                className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 text-slate-700 rounded-sm hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer font-medium"
              >
                <Download className="w-3 h-3" />
                <span>下載 .gs 檔</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1 text-[11px] bg-[#1b4372] text-white rounded-sm hover:bg-[#122e4f] transition flex items-center gap-1 cursor-pointer font-bold"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "已複製完整代碼！" : "一鍵複製 MemberData_Code.gs 代碼"}</span>
              </button>
            </div>
          </div>

          <div className="relative border border-slate-300 rounded-sm bg-slate-900 text-slate-200 p-3 max-h-56 overflow-y-auto font-mono text-[10.5px] leading-relaxed select-all">
            <pre className="whitespace-pre">{MEMBER_APPS_SCRIPT_SAMPLE}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
          <span>EBB Lab 專用 · 資料直接存放於您的個人 Google Drive 試算表中</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-sm transition font-serif font-bold cursor-pointer"
          >
            關閉視窗
          </button>
        </div>

      </div>
    </div>
  );
}
