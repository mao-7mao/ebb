import React, { useState, useEffect } from "react";
import { Type, Minus, Plus, RotateCcw } from "lucide-react";

export type FontSizeLevel = "sm" | "md" | "lg" | "xl";

interface FontSizeAdjusterProps {
  compact?: boolean;
}

export default function FontSizeAdjuster({ compact = false }: FontSizeAdjusterProps) {
  const [fontSize, setFontSize] = useState<FontSizeLevel>(() => {
    const saved = localStorage.getItem("ebb_font_size_preference");
    return (saved as FontSizeLevel) || "md";
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem("ebb_font_size_preference", fontSize);
  }, [fontSize]);

  const sizes: { id: FontSizeLevel; label: string; scale: string }[] = [
    { id: "sm", label: "Small", scale: "90%" },
    { id: "md", label: "Default", scale: "100%" },
    { id: "lg", label: "Large", scale: "115%" },
    { id: "xl", label: "Extra", scale: "130%" },
  ];

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs"
          title="Adjust Text Size"
          aria-label="Adjust font size"
        >
          <Type className="w-3.5 h-3.5 text-[#004b3a]" />
          <span className="font-mono text-[11px] uppercase">{fontSize}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5e5e0] rounded-sm shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 py-1 border-b border-[#e5e5e0] mb-1">
              <span className="text-[11px] font-bold text-[#004b3a] uppercase tracking-wider font-serif">
                Font Size
              </span>
              <button
                type="button"
                onClick={() => {
                  setFontSize("md");
                  setIsOpen(false);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                title="Reset to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setFontSize(s.id);
                    setIsOpen(false);
                  }}
                  className={`px-2 py-1.5 text-left rounded-xs text-xs font-semibold flex items-center justify-between transition ${
                    fontSize === s.id
                      ? "bg-[#004b3a] text-white"
                      : "text-slate-700 hover:bg-[#f4f1ea]"
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] font-mono opacity-80">{s.scale}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-1 shadow-xs">
      <span className="px-2 text-[10px] font-bold text-[#8d734a] font-serif uppercase tracking-wider flex items-center gap-1">
        <Type className="w-3 h-3 text-[#004b3a]" />
        <span>Text</span>
      </span>
      <div className="flex items-center gap-0.5">
        {sizes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFontSize(s.id)}
            className={`px-2 py-1 rounded-xs text-xs font-mono font-bold transition ${
              fontSize === s.id
                ? "bg-[#004b3a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
            title={`Set text scale to ${s.scale}`}
          >
            {s.label[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
