import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   GlassFilter SVG — renders the frosted-glass distortion kernel.
   Mount it once near the top of the tree (or it self-dedupes by id).
──────────────────────────────────────────────────────────────── */
export function GlassFilter() {
  return (
    <svg
      className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      focusable="false"
    >
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
   Shared class string (kept DRY for both render paths)
──────────────────────────────────────────────────────────────── */
const sizeClasses = {
  sm: "h-9 px-5 text-xs",
  md: "h-11 px-7 text-sm",
  lg: "h-14 px-9 text-base",
} as const;

const baseClasses = [
  "relative inline-flex items-center justify-center gap-2 rounded-full",
  "font-semibold tracking-tight cursor-pointer select-none",
  "text-primary-foreground bg-primary",
  // liquid glass inset shadow — light
  "shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]",
  // liquid glass inset shadow — dark
  "dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]",
  "hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

/* ─────────────────────────────────────────────────────────────
   LiquidButton
   - Normal usage:   <LiquidButton onClick={...}>Label</LiquidButton>
   - asChild usage:  <LiquidButton asChild><Link to="...">Label</Link></LiquidButton>

   When asChild is true we render the glass chrome on a <button> wrapper
   and use Slot only for the INNER content span — this avoids the
   React.Children.only crash that Radix throws when Slot receives > 1 child.
──────────────────────────────────────────────────────────────── */
export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  size?: keyof typeof sizeClasses;
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size = "md", asChild = false, children, ...props }, ref) => {
    const glass = (
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 rounded-full overflow-hidden pointer-events-none"
        style={{ backdropFilter: 'url("#ns-glass")' }}
      />
    );

    if (asChild) {
      /*
       * We need to forward ref + props + className onto the child element
       * (e.g. a <Link>) without using Slot as the outer wrapper (which
       * would receive 2 children and crash). Instead, clone the single
       * child directly and inject the button chrome around its own children.
       */
      const child = React.Children.only(children) as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
      >;

      return (
        <>
          <GlassFilter />
          {React.cloneElement(child, {
            ref: ref as React.Ref<HTMLElement>,
            className: cn(baseClasses, sizeClasses[size], className, child.props.className),
            ...props,
            children: (
              <>
                {glass}
                <span className="relative z-10 flex items-center gap-2">
                  {child.props.children}
                </span>
              </>
            ),
          })}
        </>
      );
    }

    return (
      <>
        <GlassFilter />
        <button
          ref={ref}
          className={cn(baseClasses, sizeClasses[size], className)}
          {...props}
        >
          {glass}
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
      </>
    );
  }
);

LiquidButton.displayName = "LiquidButton";

export default LiquidButton;
