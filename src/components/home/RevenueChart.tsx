import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";

/*
  Real monthly revenue for tenant "phenomebeauty", completed payments,
  pulled from the platform's own payments table.
*/
const DATA = [
  { month: "Mar", revenue: 9628 },
  { month: "Apr", revenue: 11362 },
  { month: "May", revenue: 11236 },
  { month: "Jun", revenue: 13478 },
  { month: "Jul", revenue: 22029 },
  { month: "Aug", revenue: 28032 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.s1,
      border: `1px solid ${C.border2}`,
      borderRadius: 8,
      padding: "8px 12px",
      fontFamily: FONT_BODY,
    }}>
      <div style={{ fontSize: 10, color: C.faint, marginBottom: 2 }}>{label} 2026</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
        R {payload[0].value.toLocaleString()}
      </div>
    </div>
  );
};

export const RevenueChart = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;
  const latest   = DATA[DATA.length - 1].revenue;
  const first    = DATA[0].revenue;
  const multiple = (latest / first).toFixed(1);

  return (
    <div>
      <div style={{ height: isMobile ? 140 : 180, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: C.faint, fontSize: 11, fontFamily: FONT_BODY }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.border2 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={C.gold}
              strokeWidth={2}
              fill="url(#revenueFill)"
              dot={{ r: 3, fill: C.gold, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        borderTop: `1px solid ${C.border}`,
        paddingTop: 16,
      }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.gold }}>
            R {latest.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_BODY }}>August revenue</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.em }}>
            {multiple}x
          </div>
          <div style={{ fontSize: 11, color: C.faint, fontFamily: FONT_BODY }}>since March</div>
        </div>
      </div>
    </div>
  );
};
