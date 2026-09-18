import React, { useState, useEffect } from "react";
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Calendar, 
  ExternalLink, 
  Layers, 
  ArrowRightLeft, 
  ArrowUpRight, 
  ArrowDownLeft,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { CalendarEntry } from "../../types/calendarLog";
import { 
  DEFAULT_CLIENT_ID, 
  DEFAULT_CALENDAR_ID,
  getStoredAccessToken,
  requestGoogleAccessToken,
  clearAccessToken,
  syncTwoWayWithGoogleCalendar,
  SyncResult
} from "../../services/googleCalendarService";

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CalendarEntry[];
  onUpdateEntries: (newEntries: CalendarEntry[]) => void;
}

const STORAGE_KEY_CUSTOM_CALENDAR_ID = "ebblab_custom_calendar_id";
const STORAGE_KEY_CUSTOM_CLIENT_ID = "ebblab_custom_client_id";

export default function GoogleSyncModal({
  isOpen,
  onClose,
  entries,
  onUpdateEntries
}: GoogleSyncModalProps) {
  const [clientId, setClientId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_CLIENT_ID) || DEFAULT_CLIENT_ID;
    } catch {
      return DEFAULT_CLIENT_ID;
    }
  });
  const [calendarId, setCalendarId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_CALENDAR_ID);
      if (saved && !saved.includes("34f29840b0b8064c9311026742cee0e1600d7a4a990a7e4acd99e625040baee6")) {
        return saved;
      }
      return DEFAULT_CALENDAR_ID; // "primary"
    } catch {
      return DEFAULT_CALENDAR_ID;
    }
  });
  const [direction, setDirection] = useState<"bidirectional" | "to_google" | "from_google">("bidirectional");
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showIframePreview, setShowIframePreview] = useState(true);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccessToken(getStoredAccessToken());
    }
  }, [isOpen]);

  const handleUpdateClientId = (newId: string) => {
    setClientId(newId);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_CLIENT_ID, newId);
    } catch {}
  };

  const handleUpdateCalendarId = (newId: string) => {
    setCalendarId(newId);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_CALENDAR_ID, newId);
    } catch {}
  };

  if (!isOpen) return null;

  const handleConnectGoogle = () => {
    setIsAuthenticating(true);
    setStatusMessage("正在呼叫 Google Identity 登入視窗...");

    requestGoogleAccessToken(
      clientId.trim() || DEFAULT_CLIENT_ID,
      (token) => {
        setIsAuthenticating(false);
        setAccessToken(token);
        setStatusMessage("✓ Google 帳號授權成功！已取得 Calendar API 存取權限。");
      },
      (err) => {
        setIsAuthenticating(false);
        setStatusMessage(`授權失敗：${err}`);
      }
    );
  };

  const handleDisconnect = () => {
    clearAccessToken();
    setAccessToken(null);
    setStatusMessage("已清除 Google 授權憑證。");
  };

  const handleRunSync = async () => {
    const token = accessToken || getStoredAccessToken();
    if (!token) {
      setStatusMessage("請先點擊上方「連接 Google 帳號」進行授權！");
      return;
    }

    setIsSyncing(true);
    setStatusMessage("正在與 Google Calendar API 進行雙向資料比對與同步...");

    try {
      const result = await syncTwoWayWithGoogleCalendar(
        entries,
        token,
        calendarId.trim() || DEFAULT_CALENDAR_ID,
        direction
      );

      setSyncResult(result);
      if (result.mergedEntries && result.mergedEntries.length > 0) {
        onUpdateEntries(result.mergedEntries);
      }

      if (result.error) {
        setStatusMessage(`同步遭遇警告：${result.error}`);
      } else {
        setStatusMessage(`✓ 同步完成！推送到 Google: ${result.pushedCount} 項，Google 匯入: ${result.pulledCount} 項，更新: ${result.updatedCount} 項。`);
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      setStatusMessage(`同步失敗：${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId.trim() || DEFAULT_CALENDAR_ID)}&ctz=Asia%2FTaipei`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-2xl border border-[#e5e5e0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1b4372] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-sm bg-white/10 text-amber-200">
              <RefreshCw className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm font-serif">
                Google 日曆雙向同步與公開日曆檢視
              </h3>
              <p className="text-[11px] text-blue-200/80 font-mono">
                Google Calendar OAuth 2.0 API · EBB Lab
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-sm transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Auth Status & Client ID Card */}
          <div className="p-4 bg-[#f8f8f5] rounded-sm border border-[#e5e5e0] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    accessToken ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {accessToken ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    {accessToken ? "✓ Google 帳號已授權連線" : "尚未完成 Google 授權"}
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 border border-blue-200">
                      專屬 OAuth 2.0
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {accessToken ? "已透過專屬用戶端 ID 連線，可雙向同步事項" : "點擊右側按鈕啟動 OAuth 2.0 授權登入"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {accessToken ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-[#e5e5e0] rounded-sm text-xs font-medium cursor-pointer"
                  >
                    中斷連線
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isAuthenticating}
                    className="px-4 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAuthenticating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>連線中...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5 text-amber-300" />
                        <span>連接 Google 帳號</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* OAuth Client ID Settings */}
            <div className="pt-2 border-t border-[#e5e5e0]/60 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]">
              <span className="font-bold text-slate-600 shrink-0 flex items-center gap-1">
                <span>用戶端 ID (Client ID)：</span>
              </span>
              <input
                type="text"
                value={clientId}
                onChange={(e) => handleUpdateClientId(e.target.value)}
                placeholder="Google OAuth 2.0 Client ID"
                className="flex-1 bg-white border border-[#e5e5e0] rounded-xs px-2 py-1 font-mono text-[11px] text-slate-700"
              />
              <button
                type="button"
                onClick={() => handleUpdateClientId(DEFAULT_CLIENT_ID)}
                className="text-[10px] text-[#1b4372] underline hover:text-[#122e4f] shrink-0"
              >
                重設為專屬 ID
              </button>
            </div>
          </div>

          {/* Privacy & Safe Storage Banner */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-sm text-[11px] text-emerald-950 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">🔒</span>
            <div className="space-y-0.5">
              <span className="font-bold block">週報獨立個人儲存保障：</span>
              <p className="text-emerald-900/90 leading-relaxed">
                系統已設定完全<strong>脫離 EBB 實驗室日曆</strong>。所有週報進度與日曆事項，均透過您的用戶端 ID 存入您授權 Google 帳號的個人日曆（預設為 <code>primary</code> 主日曆，或您自訂的專屬次日曆），絕不儲存在實驗室共用日曆中。
              </p>
            </div>
          </div>

          {/* Sync Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-sm border border-[#e5e5e0]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#1b4372]" />
                  <span>儲存目標日曆 (Calendar ID)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(!showHelpGuide)}
                  className="text-[10px] text-[#1b4372] underline hover:text-[#122e4f] cursor-pointer"
                >
                  {showHelpGuide ? "隱藏建立說明" : "💡 自建獨立日曆說明"}
                </button>
              </div>
              <input
                type="text"
                value={calendarId}
                onChange={(e) => handleUpdateCalendarId(e.target.value)}
                placeholder="primary (個人主日曆) 或 自訂日曆 ID"
                className="w-full bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-mono"
              />
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]">
                <span className="text-slate-400">快速切換：</span>
                <button
                  type="button"
                  onClick={() => handleUpdateCalendarId("primary")}
                  className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
                    calendarId === "primary"
                      ? "bg-[#1b4372] text-white border-[#1b4372]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                  }`}
                >
                  ★ 個人主日曆 (primary) - 預設
                </button>
              </div>

              {showHelpGuide && (
                <div className="mt-2.5 p-2.5 bg-blue-50/80 border border-blue-200 rounded text-[11px] text-blue-900 leading-relaxed">
                  <div className="font-bold mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    <span>若想在個人 Google 帳號內再建立一個「專門放週報」的日曆：</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                    <li>前往 <strong>Google 日曆</strong>網頁版。</li>
                    <li>左側「其他日曆」點擊 <strong>「＋」</strong> → <strong>「建立新日曆」</strong>（例如命名為 <code>我的實驗進度與週報</code>）。</li>
                    <li>建立完成後，點擊該日曆旁邊的 <strong>三點圖示（⋮）</strong> → 進入 <strong>「設定與共用」</strong>。</li>
                    <li>向下滾動找到 <strong>「整合日曆」</strong> 區塊中的 <strong>「日曆 ID」</strong>。</li>
                    <li>將該 ID 貼入上方「儲存目標日曆」欄位，系統將自動保存。</li>
                  </ol>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#8d734a]" />
                <span>同步方向 (Sync Direction)</span>
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
                className="w-full bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-medium"
              >
                <option value="bidirectional">🔄 雙向同步 (Bidirectional: 推送與拉取)</option>
                <option value="to_google">📤 僅推送到 Google (LabStudio → Google)</option>
                <option value="from_google">📥 僅自 Google 匯入 (Google → LabStudio)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                雙向同步可自動將 Google 行事曆的新建事件匯入 LabStudio
              </span>
            </div>
          </div>

          {/* Sync Trigger Action */}
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>立即執行同步</span>
              </span>
              <p className="text-[11px] text-blue-800/80">
                目前本機共 {entries.length} 筆事項紀錄，將與 Google 日曆自動比對。
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunSync}
              disabled={isSyncing}
              className="px-5 py-2 bg-[#1b4372] hover:bg-[#122e4f] disabled:bg-slate-400 text-white rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              {isSyncing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>同步中...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                  <span>立即同步 (Sync Now)</span>
                </>
              )}
            </button>
          </div>

          {/* Status / Log Message Banner */}
          {statusMessage && (
            <div className="p-3 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-[11px] font-mono text-slate-700 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">ℹ️</span>
              <span className="flex-1">{statusMessage}</span>
            </div>
          )}

          {/* Live Google Calendar View / Preview */}
          <div className="space-y-2 border border-[#e5e5e0] rounded-sm p-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>Google 日曆檢視 (Google Calendar View)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowIframePreview(!showIframePreview)}
                className="text-[11px] text-[#1b4372] hover:underline font-medium cursor-pointer"
              >
                {showIframePreview ? "收合檢視" : "展開檢視"}
              </button>
            </div>

            {showIframePreview && (
              calendarId === "primary" ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm text-center space-y-2">
                  <p className="text-slate-600 text-xs">
                    當前同步目標為您的 <strong>個人主日曆 (primary)</strong>。同步成功後，所有事項會直接顯示在您的 Google Calendar App 與網頁版中（完全不經過 EBB 實驗室日曆）。
                  </p>
                  <a
                    href="https://calendar.google.com/calendar/r"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-300" />
                    <span>在 Google 日曆網頁版查看我的日程 ↗</span>
                  </a>
                </div>
              ) : (
                <div className="border border-[#e5e5e0] rounded-xs overflow-hidden bg-slate-50">
                  <iframe
                    src={embedUrl}
                    style={{ border: 0 }}
                    width="100%"
                    height="380"
                    frameBorder="0"
                    scrolling="no"
                    title="Google Calendar Embed"
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#f8f8f5] border-t border-[#e5e5e0] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            專屬 OAuth Client: {clientId.slice(0, 28)}...
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold cursor-pointer transition"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
}
