import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   GlassFilter SVG — renders the frosted-glass distortion kernel.
   Hidden from layout; referenced via CSS filter url("#ns-glass").
──────────────────────────────────────────────────────────────── */
export function GlassFilter() {
  return (
    <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
      <defs>
        <filter
          id="ns-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   LiquidButton
   Usage:
     <LiquidButton onClick={...}>Create Your Booking Page</LiquidButton>
     <LiquidButton asChild><Link to="/onboarding">...</Link></LiquidButton>
──────────────────────────────────────────────────────────────── */
export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-9 px-5 text-xs",
  md: "h-11 px-7 text-sm",
  lg: "h-13 px-9 text-base",
};

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size = "md", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <>
        <GlassFilter />
        <Comp
          ref={ref as React.Ref<HTMLButtonElement>}
          className={cn(
            "relative inline-flex items-center justify-center gap-2 rounded-full",
            "font-semibold tracking-tight cursor-pointer",
            "text-primary-foreground",
            "bg-primary",
            /* Liquid glass inset shadow — light mode */
            "shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]",
            /* Liquid glass inset shadow — dark mode */
            "dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]",
            "hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200",
            "disabled:pointer-events-none disabled:opacity-50",
            "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          {/* Backdrop glass layer */}
          <div
            className="absolute inset-0 -z-10 rounded-full overflow-hidden"
            style={{ backdropFilter: 'url("#ns-glass")' }}
          />
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </Comp>
      </>
    );
  }
);

LiquidButton.displayName = "LiquidButton";

export default LiquidButton;
