import React, { useState, useEffect, useRef } from "react";
import { 
  Wrench, 
  ExternalLink, 
  RefreshCw, 
  QrCode, 
  Check, 
  Copy, 
  Info, 
  Maximize2,
  Minimize2,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Database
} from "lucide-react";
import QRCodeLib from "qrcode";
import { EXTERNAL_LINKS } from "../../config/externalLinks";

export default function InstrumentManagementTab() {
  const managementScriptUrl = EXTERNAL_LINKS.instrumentManagementScriptUrl;
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate QR code for mobile quick scan
  useEffect(() => {
    QRCodeLib.toDataURL(managementScriptUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1b4372",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [managementScriptUrl]);

  const handleRefreshIframe = () => {
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(managementScriptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef}
      className={`space-y-4 animate-in fade-in duration-200 ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#f8f8f5] p-4 flex flex-col h-screen overflow-hidden" : ""
      }`}
    >
      {/* Top Banner / Control Panel */}
      <div className="bg-white border border-[#e5e5e0] rounded-sm p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-[#1b4372]/10 text-[#1b4372] rounded-sm">
              <Wrench className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#1b4372] font-serif tracking-tight">
              儀器管理後台 (Instrument Management)
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              雲端系統連線中
            </span>
          </div>
          <p className="text-xs text-[#666]">
            實驗室儀器設備清冊維護、預約狀態審核與儀器設定（Google Apps Script 雲端應用程式）
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshIframe}
            title="重新載入系統"
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#f8f8f5] hover:bg-[#eee] border border-[#d5d5d0] rounded-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#1b4372]" : ""}`} />
            <span>重新整理</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            title="手機掃描 QR Code 於行動裝置檢視"
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#f8f8f5] hover:bg-[#eee] border border-[#d5d5d0] rounded-sm flex items-center gap-1.5 transition"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">行動條碼</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            title="複製儀器管理後台直連網址"
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#f8f8f5] hover:bg-[#eee] border border-[#d5d5d0] rounded-sm flex items-center gap-1.5 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">已複製！</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>複製網址</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "結束全螢幕" : "切換全螢幕檢視"}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#f8f8f5] hover:bg-[#eee] border border-[#d5d5d0] rounded-sm flex items-center gap-1.5 transition"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>縮小</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>全螢幕</span>
              </>
            )}
          </button>

          <a
            href={managementScriptUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="於新視窗開啟儀器管理系統"
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1b4372] hover:bg-[#123154] rounded-sm flex items-center gap-1.5 shadow-xs transition"
          >
            <span>在新視窗開啟</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Application Viewport */}
      <div 
        className={`bg-white border border-[#e5e5e0] rounded-sm shadow-xs relative overflow-hidden flex flex-col ${
          isFullscreen ? "flex-1 h-full" : "h-[800px] min-h-[600px]"
        }`}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#fdfdfc]/90 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]">
            <div className="w-10 h-10 border-3 border-[#1b4372]/20 border-t-[#1b4372] rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-bold text-[#1b4372] font-serif">載入儀器管理系統中...</p>
              <p className="text-xs text-slate-400 mt-0.5">連線至 Google Apps Script 雲端應用程式</p>
            </div>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          key={iframeKey}
          src={managementScriptUrl}
          title="儀器管理系統"
          onLoad={() => setIsLoading(false)}
          allow="fullscreen; clipboard-read; clipboard-write; camera"
          className="w-full h-full border-0 flex-1"
        />

        {/* Bottom Status / Tip Bar */}
        <div className="bg-[#fafaf8] border-t border-[#e5e5e0] px-4 py-2 text-[11px] text-[#666] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#1b4372] shrink-0" />
            <span>
              若遇到 Google 帳號授權頁面或畫面無法正常顯示，請點選上方「在新視窗開啟」以取得完整的存取權限。
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Google Apps Script Web App</span>
            <span>·</span>
            <span>EBB Lab 設備管理</span>
          </div>
        </div>
      </div>

      {/* QR Code Modal for Mobile Quick Scan */}
      {showQrModal && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-sm border border-[#e5e5e0] p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#1b4372]" />
                <h4 className="text-sm font-bold text-[#1b4372] font-serif">
                  手機掃描開啟儀器管理
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              {qrCodeDataUrl ? (
                <div className="p-3 bg-white border border-[#e5e5e0] rounded-sm shadow-inner">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Instrument Management QR Code" 
                    className="w-52 h-52 object-contain"
                  />
                </div>
              ) : (
                <div className="w-52 h-52 bg-slate-100 animate-pulse rounded-sm flex items-center justify-center text-xs text-slate-400">
                  產生 QR Code 中...
                </div>
              )}
              <p className="text-xs text-slate-500 mt-3 text-center">
                使用手機相機掃描條碼，即可直接在行動裝置上進入儀器管理系統。
              </p>
            </div>

            <div className="pt-2 border-t border-[#e5e5e0] flex justify-end">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-1.5 bg-[#1b4372] text-white text-xs font-bold rounded-sm hover:bg-[#123154] transition"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
