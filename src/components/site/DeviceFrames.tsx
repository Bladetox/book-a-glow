import { ReactNode } from "react";

interface DeviceFrameProps {
  children: ReactNode;
  interactive?: boolean;
}

export const LaptopFrame = ({ children, interactive = true }: DeviceFrameProps) => (
  <div className="relative mx-auto w-full" style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.25)) drop-shadow(0 8px 16px rgba(0,0,0,0.15))" }}>
    <div className="rounded-t-[10px] bg-[#1a1a1a] border-[2px] border-b-0 border-[#2a2a2a] p-[5px] pt-[5px]">
      <div className="flex justify-center mb-[2px]">
        <div className="w-[10px] h-[10px] rounded-full bg-[#0d0d0d] border border-[#333] flex items-center justify-center">
          <div className="w-[3px] h-[3px] rounded-full bg-[#1a2a3a]" />
        </div>
      </div>
      <div className={`rounded-[3px] overflow-hidden bg-[hsl(0,0%,4%)] ${!interactive ? "pointer-events-none select-none" : ""}`} style={{ aspectRatio: "16 / 10" }}>
        <div className="w-full h-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{children}</div>
      </div>
    </div>
    <div className="h-[3px] bg-[#1d1d1d] border-x-[2px] border-[#2a2a2a]" />
    <div className="h-[5px] bg-gradient-to-b from-[#2a2a2a] to-[#222] rounded-b-sm" />
    <div className="mx-[-2%] h-[7px] bg-gradient-to-b from-[#252525] to-[#1e1e1e] rounded-b-lg border border-t-0 border-[#333]">
      <div className="mx-auto w-[16%] h-[2px] mt-[2px] rounded-full bg-[#333]" />
    </div>
  </div>
);

export const MobileFrame = ({ children, interactive = true }: DeviceFrameProps) => (
  <div className="relative mx-auto w-full bg-[#1a1a1a] rounded-[22%/8%]">
    <div className="rounded-[22%/8%] border-[2px] border-[#3a3a3a] bg-[#1a1a1a] p-[3px]">
      <div className="absolute left-[-2.5px] top-[20%] w-[2.5px] h-[8%] rounded-l-sm bg-[#3a3a3a]" />
      <div className="absolute left-[-2.5px] top-[30%] w-[2.5px] h-[12%] rounded-l-sm bg-[#3a3a3a]" />
      <div className="absolute left-[-2.5px] top-[44%] w-[2.5px] h-[12%] rounded-l-sm bg-[#3a3a3a]" />
      <div className="absolute right-[-2.5px] top-[28%] w-[2.5px] h-[14%] rounded-r-sm bg-[#3a3a3a]" />
      <div
        className={`relative rounded-[20%/7%] overflow-hidden bg-black ${!interactive ? "pointer-events-none select-none" : ""}`}
        style={{ aspectRatio: "9 / 19.5" }}
      >
        {/* Notch pill */}
        <div className="absolute top-[1.2%] left-1/2 -translate-x-1/2 z-10 w-[28%] h-[3%] rounded-full bg-black border border-[#0d0d0d]" />
        {/* 2x scale container: explicit height so children using h-full resolve correctly */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{ width: "200%", height: "200%", transform: "scale(0.5)" }}
        >
          <div
            className={`w-full h-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[hsl(0,0%,4%)] ${!interactive ? "pointer-events-none select-none" : ""}`}
          >
            {children}
          </div>
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-[1.5%] left-1/2 -translate-x-1/2 w-[32%] h-[0.6%] rounded-full bg-white/20 z-10" />
      </div>
    </div>
  </div>
);
