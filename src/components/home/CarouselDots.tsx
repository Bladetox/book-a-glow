import { useEffect, useState } from "react";

export const CarouselDots = ({ trackId, count, label }: { trackId: string; count: number; label: string }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const track = document.getElementById(trackId);
    if (!track) return;
    const update = () => {
      const items = Array.from(track.children) as HTMLElement[];
      const left = track.getBoundingClientRect().left;
      let best = 0, distance = Infinity;
      items.forEach((item, index) => {
        const d = Math.abs(item.getBoundingClientRect().left - left);
        if (d < distance) { best = index; distance = d; }
      });
      setActive(best);
    };
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => { track.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [trackId, count]);
  return <div className="home-carousel-dots" role="group" aria-label={label}>
    {Array.from({ length: count }, (_, index) => <button key={index} type="button" className={index === active ? "is-active" : ""} aria-label={`Show ${label.toLowerCase()} ${index + 1} of ${count}`} aria-current={index === active ? "true" : undefined} onClick={() => {
      const track = document.getElementById(trackId);
      const item = track?.children[index] as HTMLElement | undefined;
      item?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
    }} />)}
  </div>;
};
