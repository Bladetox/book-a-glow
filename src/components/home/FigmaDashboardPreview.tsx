import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import MarketingDashboardSnapshot from "./MarketingDashboardSnapshot";
import MarketingMobileDashboardSnapshot from "./MarketingMobileDashboardSnapshot";

/**
 * Responsive marketing-only dashboard preview.
 *
 * The admin product remains untouched. This component keeps the preview
 * contained at desktop/tablet widths and uses the compact mobile composition
 * on narrow screens, rather than forcing a fixed-width dashboard into view.
 */
export const FigmaDashboardPreview = () => {
  const width = useWindowWidth();
  const isCompact = width < 960;
  const isMobile = width < BP;

  if (isCompact) {
    const scale = isMobile ? Math.min(0.82, Math.max(0.66, (width - 32) / 390)) : 0.9;
    const previewWidth = 390 * scale;
    const previewHeight = 560 * scale;

    return (
      <div
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: previewWidth,
            height: previewHeight,
            maxWidth: "100%",
            overflow: "hidden",
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
          }}
        >
          <MarketingMobileDashboardSnapshot scale={scale} />
        </div>
      </div>
    );
  }

  const availableWidth = Math.min(620, Math.max(0, width - 64));
  const scale = availableWidth / 1000;
  const previewHeight = 760 * scale;

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: availableWidth,
          maxWidth: "100%",
          height: previewHeight,
          overflow: "hidden",
          borderRadius: 18,
          filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.24))",
        }}
      >
        <MarketingDashboardSnapshot scale={scale} />
      </div>
    </div>
  );
};

export default FigmaDashboardPreview;
