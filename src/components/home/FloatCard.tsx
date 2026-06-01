import { useRef } from "react";
import { C, FONT_DISPLAY, FONT_BODY } from "./tokens";

/* ─── Types ───────────────────────────────────────────────── */
export interface FloatCardData {
  id:    number;
  x:     number;
  y:     number;
  z:     number;
  vx:    number;
  vy:    number;
  label: string;
  value: string;
  sub:   string;
  color: string;
  width: number;
}

/* ─── FloatCard ───────────────────────────────────────────── */
const FloatCard = ({
  card,
  containerRef,
  onDragUpdate,
  mobile,
}: {
  card:          FloatCardData;
  containerRef:  React.RefObject<HTMLDivElement>;
  onDragUpdate:  (id: number, x: number, y: number) => void;
  mobile:        boolean;
}) => {
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (mobile) return;
    isDragging.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    onDragUpdate(
      card.id,
      e.clientX - cr.left - dragOffset.current.x,
      e.clientY - cr.top  - dragOffset.current.y,
    );
  };

  const onPointerUp = () => { isDragging.current = false; };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position:             "absolute",
        left:                 card.x,
        top:                  card.y,
        width:                card.width,
        background:           "rgba(20,20,18,0.88)",
        border:               "1px solid rgba(255,255,255,0.09)",
        borderRadius:         mobile ? 10 : 14,
        padding:              mobile ? "8px 10px" : "12px 14px",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:            "0 16px 40px rgba(0,0,0,0.55)",
        cursor:               mobile ? "default" : "grab",
        userSelect:           "none",
        touchAction:          "none",
        zIndex:               card.z,
        fontFamily:           FONT_BODY,
      }}
    >
      <div style={{
        fontSize:      mobile ? 7 : 8,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color:         C.faint,
        marginBottom:  2,
      }}>
        {card.label}
      </div>
      <div style={{
        fontSize:   mobile ? 14 : 17,
        fontWeight: 700,
        color:      card.color,
        fontFamily: FONT_DISPLAY,
        lineHeight: 1.1,
      }}>
        {card.value}
      </div>
      <div style={{ fontSize: mobile ? 8 : 9, color: C.muted, marginTop: 2 }}>
        {card.sub}
      </div>
    </div>
  );
};

export default FloatCard;
