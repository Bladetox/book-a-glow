export interface HeatmapCell {
  slot: string;
  intensity: number;
}

export interface HeatmapRow {
  day: string;
  slots: HeatmapCell[];
}

export const BookingHeatmap = ({ data }: { data: HeatmapRow[] }) => {
  const maxIntensity = Math.max(...data.flatMap((r) => r.slots.map((s) => s.intensity)), 1);

  // Derive slot labels dynamically from hook data -- no hardcoded slots
  const slotLabels = data[0]?.slots.map((s) => s.slot) ?? [];

  return (
    <>
      {/* Desktop: days = rows, slots = columns */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[10px] text-white/20 text-left pr-2 pb-2" />
              {slotLabels.map((s) => (
                <th key={s} className="text-[10px] text-white/20 text-center pb-2 px-1">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.day}>
                <td className="text-[10px] text-white/30 pr-2 py-1">{row.day}</td>
                {row.slots.map((cell) => {
                  const opacity = Math.min(cell.intensity / maxIntensity, 1);
                  return (
                    <td key={cell.slot} className="p-0.5">
                      <div
                        className="h-7 rounded-md transition-colors relative group"
                        style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.85, 0.06)})` }}
                      >
                        {cell.intensity > 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            {cell.intensity}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: slots = rows, days = columns */}
      <div className="sm:hidden overflow-x-auto -mx-1">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `auto repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {/* Header row: empty corner + day labels */}
          <div />
          {data.map((row) => (
            <div key={row.day} className="text-center text-[9px] font-semibold text-white/30 pb-1 truncate">
              {row.day}
            </div>
          ))}

          {/* One row per time slot -- derived from hook data */}
          {slotLabels.map((slot) => (
            <>
              <div key={`label-${slot}`} className="flex items-center justify-end pr-1.5">
                <span className="text-[9px] text-white/25 leading-none whitespace-nowrap">{slot}</span>
              </div>
              {data.map((row) => {
                const cell = row.slots.find((s) => s.slot === slot);
                const intensity = cell?.intensity ?? 0;
                const opacity = Math.min(intensity / maxIntensity, 1);
                return (
                  <div
                    key={`${row.day}-${slot}`}
                    className="h-8 rounded-md min-w-0"
                    style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.85, 0.06)})` }}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </>
  );
};


export default BookingHeatmap;
