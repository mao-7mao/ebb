import React, { useState, useEffect, useRef } from "react";
import { 
  Wrench, 
  ExternalLink, 
  RefreshCw, 
  QrCode, 
  Check, 
  Copy, 
  Info, 
  Calendar, 
  Clock, 
  Maximize2,
  Minimize2,
  Sparkles
} from "lucide-react";
import QRCodeLib from "qrcode";
import { EXTERNAL_LINKS } from "../config/externalLinks";

interface InstrumentReservationProps {
  onBackToHome?: () => void;
}

export default function InstrumentReservation({ onBackToHome }: InstrumentReservationProps) {
  const scriptUrl = EXTERNAL_LINKS.instrumentReservationScriptUrl;
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate QR code for mobile quick scan
  useEffect(() => {
    QRCodeLib.toDataURL(scriptUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#004b3a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [scriptUrl]);

  const handleRefreshIframe = () => {
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scriptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`space-y-6 transition-all ${isFullscreen ? "fixed inset-0 z-50 bg-[#f4f1ea] p-4 lg:p-6 overflow-y-auto" : ""}`}>
      {/* Header bar & controls */}
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-sm bg-[#004b3a] text-white">
              <Wrench className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
              Instrument & Equipment Booking
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-2">
            Instrument Reservation System
          </h2>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl font-sans">
            Online reservation and timetable scheduling for EBB lab analytical equipment, autoclaves, spectrophotometers, and bioreactors.
          </p>
        </div>

        {/* Action Controls (All in English) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* QR Code Share button */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs"
            title="Scan QR Code on Mobile"
          >
            <QrCode className="w-4 h-4 text-[#004b3a]" />
            <span className="hidden sm:inline">Mobile QR</span>
          </button>

          {/* Refresh iframe button */}
          <button
            type="button"
            onClick={handleRefreshIframe}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs"
            title="Reload Booking System"
          >
            <RefreshCw className={`w-4 h-4 text-[#004b3a] ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Toggle Fullscreen / Maximize */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#004b3a]" /> : <Maximize2 className="w-4 h-4 text-[#004b3a]" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          {/* Open in new tab (Direct Apps Script Web App) */}
          <a
            href={scriptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in New Tab</span>
          </a>
        </div>
      </div>

      {/* Main Reservation Iframe Display Container */}
      <div 
        ref={containerRef}
        className={`relative w-full rounded-sm overflow-hidden border border-[#e5e5e0] bg-[#fdfdfc] shadow-sm flex flex-col ${
          isFullscreen ? "h-[calc(100vh-130px)]" : "h-[760px] md:h-[840px]"
        }`}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#fdfdfc]/90 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-xs">
            <div className="w-10 h-10 border-3 border-[#004b3a]/20 border-t-[#004b3a] rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-[#004b3a] font-serif">Loading Instrument Reservation...</p>
            <p className="text-[11px] text-slate-400 font-mono">Connecting to Google Apps Script</p>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          key={iframeKey}
          src={scriptUrl}
          title="EBB Lab Instrument Reservation"
          className="w-full h-full border-0 rounded-sm"
          onLoad={() => setIsLoading(false)}
          allow="camera; microphone; geolocation"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />

        {/* Sub-bar footer with quick notes */}
        <div className="p-3 bg-[#f8f8f5] border-t border-[#e5e5e0] text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <Info className="w-3.5 h-3.5 text-[#004b3a] shrink-0" />
            <span>Booking Notice: Please arrive on time and complete the equipment logbook after usage.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-[11px] font-mono text-[#004b3a] hover:underline flex items-center gap-1 font-bold"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Link Copied" : "Copy Booking URL"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal for Mobile Quick Scan */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-6 max-w-sm w-full shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <h3 className="text-base font-bold text-[#004b3a] font-serif flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#8d734a]" />
                Scan to Book on Mobile
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-sm border border-[#e5e5e0] inline-block shadow-inner">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Instrument Reservation QR Code"
                  className="w-48 h-48 mx-auto object-contain"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-sm flex items-center justify-center text-xs text-slate-400">
                  Generating QR Code...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Scan this QR Code with your smartphone camera to access the instrument reservation app on mobile.
            </p>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#004b3a]" />}
                <span>{copied ? "Copied" : "Copy URL"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
