"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type DailyBucket = { date: string; bookings: number; revenue: number };
type ServiceBucket = { name: string; count: number };
type Summary = {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenuePence: number;
  days: number;
};

type AnalyticsData = {
  daily: DailyBucket[];
  byService: ServiceBucket[];
  summary: Summary;
};

const ACCENT = "#8b86f9";
const ACCENT2 = "#38bdf8";
const PIE_COLORS = ["#8b86f9", "#38bdf8", "#34d399", "#f472b6", "#fb923c", "#a78bfa", "#60a5fa"];

function money(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function shortDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const tooltipStyle = {
  backgroundColor: "#13132c",
  border: "1px solid rgba(139,134,249,0.2)",
  borderRadius: "12px",
  color: "#eef0f8",
  fontSize: "13px",
};

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  const { daily, byService, summary } = data;

  // Thin out X-axis labels when many days
  const tickInterval = daily.length > 21 ? 6 : daily.length > 14 ? 3 : 1;

  return (
    <div className="space-y-8">
      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total bookings", value: summary.totalBookings },
          { label: "Confirmed", value: summary.confirmedBookings },
          { label: "Cancelled", value: summary.cancelledBookings },
          { label: "Revenue", value: money(summary.totalRevenuePence) },
        ].map(({ label, value }) => (
          <div key={label} className="rz-card p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-rz-subtle">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Bookings over time */}
      <div className="rz-card p-6">
        <h3 className="mb-6 text-base font-bold text-white">Bookings over time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              interval={tickInterval}
              tick={{ fill: "#6b7499", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7499", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(d: unknown) => shortDate(String(d))}
              formatter={(v) => [String(v), "Bookings"]}
            />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke={ACCENT}
              strokeWidth={2}
              fill="url(#bookingsGrad)"
              dot={false}
              activeDot={{ r: 4, fill: ACCENT }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue over time */}
      <div className="rz-card p-6">
        <h3 className="mb-6 text-base font-bold text-white">Revenue (GBP)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              interval={tickInterval}
              tick={{ fill: "#6b7499", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7499", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `£${(v / 100).toFixed(0)}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(d: unknown) => shortDate(String(d))}
              formatter={(v) => [money(Number(v)), "Revenue"]}
            />
            <Bar
              dataKey="revenue"
              fill={ACCENT2}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Service breakdown */}
      {byService.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rz-card p-6">
            <h3 className="mb-6 text-base font-bold text-white">Bookings by service</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byService}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                >
                  {byService.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "Bookings"]} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", color: "#9aa3c2" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Service table */}
          <div className="rz-card overflow-hidden p-0">
            <div className="border-b border-white/[0.07] px-6 py-4">
              <h3 className="text-base font-bold text-white">Service breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.03]">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-rz-subtle">Service</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-rz-subtle">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {byService.map((row, idx) => (
                  <tr key={row.name} className="border-b border-white/[0.05] last:border-0">
                    <td className="flex items-center gap-2.5 px-6 py-3.5">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-rz-muted">{row.name}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-white">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
