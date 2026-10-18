import { useEffect, useRef, useState } from "react";

/**
 * Renders a same-origin page at a true device viewport (1280px laptop / 390px phone)
 * and scales it to fit its parent. Because the page runs in its own viewport, every
 * responsive breakpoint matches the real app on that device.
 */
const NATIVE_WIDTH = { desktop: 1280, mobile: 390 } as const;

const DemoDeviceIframe = ({
  device,
  src,
  title,
}: {
  device: keyof typeof NATIVE_WIDTH;
  src: string;
  title: string;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const native = NATIVE_WIDTH[device];
  const scale = size.w > 0 ? size.w / native : 0;

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden bg-black">
      {scale > 0 && (
        <iframe
          title={title}
          src={src}
          style={{
            width: native,
            height: size.h / scale,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: "#000",
          }}
        />
      )}
    </div>
  );
};

export default DemoDeviceIframe;
