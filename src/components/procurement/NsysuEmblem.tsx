import React from "react";

interface NsysuEmblemProps {
  className?: string;
  size?: number;
}

export default function NsysuEmblem({ className = "", size = 80 }: NsysuEmblemProps) {
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
          // If /logo.svg fails, try /nsysu_seal.png or hide gracefully
          const target = e.currentTarget;
          if (target.src.endsWith("/logo.svg")) {
            target.src = "/nsysu_seal.png";
          } else {
            target.style.display = "none";
          }
        }}
      />
    </div>
  );
}
