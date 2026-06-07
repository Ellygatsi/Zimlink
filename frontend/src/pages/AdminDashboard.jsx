import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { CurrencyDollar, Phone, ChartLineUp, Users, Sliders, Clock, Gear } from "@phosphor-icons/react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [calls, setCalls] = useState([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/admin/stats/calls?days=${days}`),
      api.get("/admin/calls?limit=20"),
    ]).then(([s, c]) => {
      if (cancelled) return;
      setStats(s.data);
      setCalls(c.data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [days]);

  const loading = !stats;

  if (loading || !stats) return <p className="overline">Loading dashboard…</p>;

  const s = stats.summary;
  const fmt = (n) => `$${(n || 0).toFixed(2)}`;
  const maxRevenue = Math.max(0.0001, ...stats.by_day.map(d => d.revenue));

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="overline text-neutral-500">ADMIN · REVENUE COMMAND CENTER</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Dashboard.</h1>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              data-testid={`period-${d}`}
              className={`nb-btn text-sm ${days === d ? "" : "bg-white"}`}
              style={days === d ? { backgroundColor: "#0A0A0A", color: "white" } : {}}
            >
              Last {d}d
            </button>
          ))}
          <Link to="/admin/rates" className="nb-btn text-sm bg-white" data-testid="manage-rates-link">
            <Sliders size={16} weight="bold" /> Rates
          </Link>
          <Link to="/admin/settings" className="nb-btn text-sm bg-white" data-testid="manage-settings-link">
            <Gear size={16} weight="bold" /> Settings
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="REVENUE"
          value={fmt(s.total_revenue)}
          accent={ACCENTS.wallet}
          icon={<CurrencyDollar size={26} weight="bold" />}
          testid="kpi-revenue"
        />
        <KpiCard
          label="PROFIT"
          value={fmt(s.total_profit)}
          accent={ACCENTS.community}
          icon={<ChartLineUp size={26} weight="bold" />}
          testid="kpi-profit"
        />
        <KpiCard
          label="CALLS"
          value={s.total_calls}
          accent={ACCENTS.calling}
          icon={<Phone size={26} weight="bold" />}
          testColor="white"
          testid="kpi-calls"
        />
        <KpiCard
          label="MINUTES"
          value={(s.total_seconds / 60).toFixed(1)}
          accent={ACCENTS.marketplace}
          icon={<Clock size={26} weight="bold" />}
          testid="kpi-minutes"
        />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="nb-card p-5">
          <p className="overline">USERS</p>
          <p className="text-4xl font-black mt-2 mono">{stats.user_count}</p>
          <p className="text-xs text-neutral-500 mt-1">Registered accounts</p>
        </div>
        <div className="nb-card p-5">
          <p className="overline">BILLED CALLS</p>
          <p className="text-4xl font-black mt-2 mono">{s.billed_calls}/{s.total_calls}</p>
          <p className="text-xs text-neutral-500 mt-1">Calls that successfully charged the wallet</p>
        </div>
        <div className="nb-card p-5">
          <p className="overline">MARGIN</p>
          <p className="text-4xl font-black mt-2 mono">
            {s.total_revenue > 0 ? `${((s.total_profit / s.total_revenue) * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Profit ÷ revenue</p>
        </div>
      </div>

      {/* Revenue by day chart */}
      <div className="nb-card p-5" data-testid="revenue-chart">
        <p className="overline mb-4">REVENUE BY DAY</p>
        {stats.by_day.length === 0 ? (
          <p className="text-sm text-neutral-500">No data for this period yet.</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {stats.by_day.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full border-2 border-black rounded-t-md min-h-[2px] transition-all"
                  style={{
                    backgroundColor: ACCENTS.wallet,
                    height: `${(d.revenue / maxRevenue) * 100}%`,
                  }}
                  title={`${d.date}: $${d.revenue.toFixed(2)} · ${d.calls} calls`}
                />
                <span className="text-[9px] text-neutral-500 mono whitespace-nowrap">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top callers */}
      <div className="nb-card p-5">
        <p className="overline mb-4 flex items-center gap-2"><Users size={14} weight="bold" /> TOP CALLERS</p>
        {stats.top_callers.length === 0 ? (
          <p className="text-sm text-neutral-500">No paying calls yet.</p>
        ) : (
          <div className="space-y-2" data-testid="top-callers-list">
            {stats.top_callers.map((c, i) => (
              <div key={c.user_id} className="flex items-center justify-between py-2 border-b-2 border-black last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 border-2 border-black rounded-full bg-[#FFCD00] flex items-center justify-center font-black text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm">{c.user_name}</p>
                    <p className="text-xs text-neutral-500">{c.user_email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black mono">${c.spent.toFixed(2)}</p>
                  <p className="text-xs text-neutral-500">{c.calls} calls · {c.minutes.toFixed(1)}m</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent calls table */}
      <div className="nb-card p-5">
        <p className="overline mb-4">RECENT CALLS</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="calls-table">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="pb-2 overline">When</th>
                <th className="pb-2 overline">User</th>
                <th className="pb-2 overline">To</th>
                <th className="pb-2 overline">Dur</th>
                <th className="pb-2 overline text-right">Charge</th>
                <th className="pb-2 overline text-right">Profit</th>
                <th className="pb-2 overline text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-neutral-500 text-center">No calls yet</td></tr>
              )}
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-neutral-200">
                  <td className="py-2 text-xs mono whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</td>
                  <td className="py-2">{c.user_name || "—"}</td>
                  <td className="py-2 mono text-xs">{c.to}</td>
                  <td className="py-2 mono text-xs">{c.duration_seconds}s</td>
                  <td className="py-2 mono text-right">${(c.charge_amount || 0).toFixed(2)}</td>
                  <td className="py-2 mono text-right">${(c.profit_amount || 0).toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <span className={`nb-pill text-[9px] ${
                      c.status === "completed" ? "bg-[#009639] text-white" :
                      c.status === "billing_failed" ? "bg-[#DE2010] text-white" :
                      "bg-[#FFCD00]"
                    }`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, icon, testid }) {
  // Auto-flip text to white on dark accents
  const dark = ["#0A0A0A", "#009639", "#DE2010", "#1F2937", "#0B6E4F", "#B7472A", "#2C2C2C"].includes(accent);
  return (
    <div className="nb-card p-5" style={{ backgroundColor: accent, color: dark ? "#FFFFFF" : "#0A0A0A" }} data-testid={testid}>
      <div className="flex justify-between items-start">
        <p className="overline">{label}</p>
        {icon}
      </div>
      <p className="text-3xl md:text-4xl font-black mt-3 mono tracking-tighter">{value}</p>
    </div>
  );
}
