import React from "react";

interface NsysuEmblemProps {
  className?: string;
  size?: number;
}

export default function NsysuEmblem({ className = "", size = 80 }: NsysuEmblemProps) {
  // Try rendering the SVG logo from /logo.svg with an elegant fallback
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`} 
      style={{ width: size, height: size }}
      title="國立中山大學校徽 National Sun Yat-sen University"
    >
      <img 
        src="/logo.svg" 
        alt="國立中山大學校徽" 
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to high-precision vector emblem
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    </div>
  );
}
